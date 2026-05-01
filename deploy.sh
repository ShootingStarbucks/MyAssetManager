#!/bin/bash
set -e

IMAGE_NAME="myasset-manager"
DB_PATH="/home/ubuntu/app/data"
BLUE_PORT=3000
GREEN_PORT=3001
NGINX_CONF="/etc/nginx/sites-available/nextjs"

# DB 디렉토리 생성 (최초 1회)
mkdir -p $DB_PATH

# 현재 활성 컨테이너 확인
ACTIVE=$(docker ps --format '{{.Names}}' | grep -E 'blue|green' || echo "none")

if [[ "$ACTIVE" == *"blue"* ]]; then
  NEW_COLOR="green"
  NEW_PORT=$GREEN_PORT
  OLD_COLOR="blue"
else
  NEW_COLOR="blue"
  NEW_PORT=$BLUE_PORT
  OLD_COLOR="green"
fi

echo "▶ 새 버전: $NEW_COLOR (포트 $NEW_PORT)"

# 이미지 로드
docker load < ~/$IMAGE_NAME.tar.gz

# 마이그레이션 실행 (서버 DB 파일에 직접)
echo "🗄️ DB 마이그레이션 실행 중..."
cd /home/ubuntu
npx prisma migrate deploy
echo "✅ 마이그레이션 완료"

# 기존 동명 컨테이너 제거 (중지 상태로 남아있을 경우)
docker rm -f "${IMAGE_NAME}-${NEW_COLOR}" 2>/dev/null || true

# 새 컨테이너 실행 (DB 볼륨 마운트)
docker run -d \
  --name "${IMAGE_NAME}-${NEW_COLOR}" \
  --restart unless-stopped \
  -p ${NEW_PORT}:3000 \
  -v $DB_PATH:/app/prisma \
  --env-file /home/ubuntu/.env.local \
  $IMAGE_NAME:latest

# 헬스체크 (최대 30초 대기)
echo "⏳ 헬스체크 중..."
sleep 10
for i in $(seq 1 10); do
  if curl -sf http://localhost:${NEW_PORT}/api/health; then
    echo "✅ 헬스체크 통과"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ 헬스체크 실패 - 롤백"
    docker stop "${IMAGE_NAME}-${NEW_COLOR}" || true
    docker rm "${IMAGE_NAME}-${NEW_COLOR}" || true
    exit 1
  fi
  sleep 5
done

# Nginx 트래픽 전환
sudo sed -i "s/proxy_pass http:\/\/localhost:[0-9]*/proxy_pass http:\/\/localhost:${NEW_PORT}/" $NGINX_CONF
sudo nginx -t && sudo nginx -s reload

# 이전 컨테이너 종료
if [[ "$OLD_COLOR" != "none" && "$OLD_COLOR" != "$NEW_COLOR" ]]; then
  docker stop "${IMAGE_NAME}-${OLD_COLOR}" || true
  docker rm "${IMAGE_NAME}-${OLD_COLOR}" || true
fi

echo "🚀 배포 완료! 활성: $NEW_COLOR"
