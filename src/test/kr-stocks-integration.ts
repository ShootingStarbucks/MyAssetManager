import { fetchKrStockQuote } from '../lib/yahoo-finance-client'

const tickers = [
  { code: '005930', name: '삼성전자' },
  { code: '000660', name: 'SK하이닉스' },
  { code: '035720', name: '카카오' },
]

async function main() {
  console.log('=== 한국 주식 현재가 API 테스트 ===\n')

  for (const { code, name } of tickers) {
    try {
      const quote = await fetchKrStockQuote(code)
      console.log(`✅ ${name} (${code})`)
      console.log(`   가격: ${quote.price.toLocaleString('ko-KR')} ${quote.currency}`)
      console.log(`   변동: ${quote.change >= 0 ? '+' : ''}${quote.change.toLocaleString('ko-KR')} (${quote.changePercent.toFixed(2)}%)`)
      console.log()
    } catch (e) {
      const err = e as NodeJS.ErrnoException
      console.log(`❌ ${name} (${code}) — ${err.code ?? err.message}`)
      console.log()
    }
  }
}

main()
