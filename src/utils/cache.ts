interface CacheItem<T> {
    data: T;
    timestamp: number;
}

class Cache {
    private static instance: Cache;
    private cache: Map<string, CacheItem<any>>;
    private readonly TTL: number = 5 * 60 * 1000; // 5 minutos en milisegundos

    private constructor() {
        this.cache = new Map();
    }

    public static getInstance(): Cache {
        if (!Cache.instance) {
            Cache.instance = new Cache();
        }
        return Cache.instance;
    }

    set<T>(key: string, value: T): void {
        this.cache.set(key, {
            data: value,
            timestamp: Date.now()
        });
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        // Verificar si el ítem ha expirado
        if (Date.now() - item.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }

        return item.data as T;
    }

    clear(): void {
        this.cache.clear();
    }
}

export default Cache.getInstance();
