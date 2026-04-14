export interface PriceProvider {
  getStockPrice(symbol: string, exchange: string): Promise<number | null>
  getCryptoPrice(symbol: string): Promise<number | null>
  getExchangeRate(from: string, to: string): Promise<number | null>
}
