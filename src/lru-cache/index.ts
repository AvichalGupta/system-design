export class LRUCache<T> {
    private cache: Map<string, T>;
    private maxSize: number;
    constructor(maxSize: number, items: T[]) {
        if (maxSize < 0) throw new Error('Max size cannot be negative')

        this.cache = new Map<string, T>();
        this.maxSize = maxSize || Number.MAX_SAFE_INTEGER;

    }

    public add(key: string, value: T): void {
        if (this.cache.size >= this.maxSize) {
            
        } else {
            this.cache.set(key, value);
        }
    }
}