export class SimpleCache<T = any> {
  private cache: Map<string, { value: T; expiry: number }>

  constructor() {
    this.cache = new Map()
  }

  async set<K extends T = T>(key: string, value: K, ttl: number = 60): Promise<void> {
    const expiry = Date.now() + ttl * 1000
    this.cache.set(key, { value, expiry })
  }

  async get<K extends T = T>(key: string): Promise<K | null> {
    const item = this.cache.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    return item.value as K
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }
}
