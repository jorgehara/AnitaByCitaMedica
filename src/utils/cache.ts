interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class Cache {
    private static instance: Cache;
    private cache: Map<string, CacheItem<any>>;
    private readonly DEFAULT_TTL: number = 5 * 60 * 1000; // 5 minutos en milisegundos

    private constructor() {
        this.cache = new Map();
    }

    public static getInstance(): Cache {
        if (!Cache.instance) {
            Cache.instance = new Cache();
        }
        return Cache.instance;
    }

    set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
        this.cache.set(key, {
            data: value,
            timestamp: Date.now(),
            ttl
        });
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        // Verificar si el ítem ha expirado
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data as T;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    has(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) return false;

        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    keys(): string[] {
        // Limpiar claves expiradas antes de retornar
        for (const [key, item] of this.cache.entries()) {
            if (Date.now() - item.timestamp > item.ttl) {
                this.cache.delete(key);
            }
        }
        return Array.from(this.cache.keys());
    }
}

export default Cache.getInstance();
