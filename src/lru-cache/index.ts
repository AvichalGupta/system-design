import { DoublyLinkedList, DoublyLinkedListNode, MAX_SIZE } from '@avichal-gupta/dsa';

interface LRUInternalType<T> {
    key: string;
    value: T;
}

interface NodeMapperItf<T> { 
    node: DoublyLinkedListNode<LRUInternalType<T>>, 
    ttl: number | null 
}

export interface LRUCacheOptions {
    maxSize: number;
    useDefaultTTL: boolean;
    defaultTTLInMS: number;
    ttlSweepTimeInMS: number;
    ttlSweepWindowSize: number;
    ttlSweepWindowDuration: number;
    useTimeBoundedTTLSweep: boolean;
}

const DEFAULT_TTL = 15 * 60 * 1000;
const DEFAULT_WINDOW_SIZE = 100;
const DEFAULT_WINDOW_DURATION = 50;
const DEFAULT_TTL_SWEEP_DURATION = 500;

export class LRUCache<T> {
    
    // Stores nodes mapped with key for constant time lookups, the nodes are used in DLL operations.
    #nodeMapper: Map<string, NodeMapperItf<T>>;
    
    // Stores key of nodes with TTL mapped for constant time lookups, the keys are used to fetch nodes and ttl information from the #nodeMapper.
    #ttlKeyStore: Set<string>;

    // Stores a list of iterators that must be used to verify TTL, this is needed to avoid re-running the TTL Sweeps on the same set of keys everytime.
    #ttlIterator: MapIterator<string>;
    
    // Stores ordered nodes for constant time lookup of most recent to least recent nodes.
    #doublyLinkedList: DoublyLinkedList<LRUInternalType<T>>;
    
    // Stores cache options
    #cacheOptions: LRUCacheOptions;

    #intervalId: ReturnType<typeof setTimeout> | null;

    private maxSize: number;
    constructor(ops?: Partial<LRUCacheOptions>) {
        if (ops) {
            this.validateCacheOptions(ops);
        }

        this.#cacheOptions = {
            maxSize: ops?.maxSize ? Math.min(ops?.maxSize, MAX_SIZE) : MAX_SIZE,
            defaultTTLInMS: ops?.defaultTTLInMS ?? DEFAULT_TTL,
            useDefaultTTL: ops?.useDefaultTTL ?? false,
            ttlSweepTimeInMS: ops?.ttlSweepTimeInMS ?? DEFAULT_TTL_SWEEP_DURATION,
            ttlSweepWindowSize: ops?.ttlSweepWindowSize ?? DEFAULT_WINDOW_SIZE,
            ttlSweepWindowDuration: ops?.ttlSweepWindowDuration ?? DEFAULT_WINDOW_DURATION,
            useTimeBoundedTTLSweep: ops?.useTimeBoundedTTLSweep ?? false
        }

        this.maxSize = ops?.maxSize || MAX_SIZE;
        this.#nodeMapper = new Map<string, NodeMapperItf<T>>();
        this.#ttlKeyStore = new Set<string>();
        this.#ttlIterator = this.#ttlKeyStore.keys();
        this.#doublyLinkedList = new DoublyLinkedList<LRUInternalType<T>>({ maxSize: this.maxSize });
        this.#intervalId = null;

        this.#sweep();
    }

    validateCacheOptions(opts: Partial<LRUCacheOptions>) {
        if (opts.maxSize && (!Number.isInteger(opts.maxSize) || opts.maxSize <= 0)) {
            throw new Error('maxSize must be a positive integer');
        }

        if (opts.useDefaultTTL) {
            if (opts.defaultTTLInMS && (!Number.isFinite(opts.defaultTTLInMS) || opts.defaultTTLInMS <= 0)) {
                throw new Error('defaultTTLInMS must be a positive number when useDefaultTTL is true');
            }
        }

        if (opts.ttlSweepTimeInMS && (!Number.isFinite(opts.ttlSweepTimeInMS) || opts.ttlSweepTimeInMS <= 0)) {
            throw new Error('ttlSweepTimeInMS must be a positive number');
        }

        // Guardrail: too frequent sweeps
        if (opts.ttlSweepTimeInMS && opts.ttlSweepTimeInMS < 20) {
            throw new Error('ttlSweepTimeInMS is too small; must be >= 20ms to avoid CPU starvation');
        }

        if (opts.useTimeBoundedTTLSweep) {
            if (
                opts.ttlSweepWindowDuration &&
                (
                    !Number.isFinite(opts.ttlSweepWindowDuration) ||
                    opts.ttlSweepWindowDuration <= 0
                )
            ) {
                throw new Error('ttlSweepWindowDuration must be a positive number when useTimeBoundedTTLSweep is true');
            }

            // Safety cap (event loop protection)
            if (opts.ttlSweepWindowDuration) {
                if (opts.ttlSweepTimeInMS && opts.ttlSweepWindowDuration > opts.ttlSweepTimeInMS) {
                    throw new Error('ttlSweepWindowDuration must be <= ttlSweepTimeInMS')
                } else if (opts.ttlSweepWindowDuration > DEFAULT_TTL_SWEEP_DURATION) {
                    throw new Error(`ttlSweepWindowDuration must be <= ${DEFAULT_TTL_SWEEP_DURATION}ms to avoid event loop blocking`);
                }
            }
        } else {
            if (
                opts.ttlSweepWindowSize &&
                (
                    !Number.isInteger(opts.ttlSweepWindowSize) ||
                    opts.ttlSweepWindowSize <= 0
                )
            ) {
                throw new Error( 'ttlSweepWindowSize must be a positive integer when using count-based sweep');
            }
        }
    }

    #sweep() {

        if (this.#intervalId) {
            clearTimeout(this.#intervalId);
        }

        const start = Date.now();

        if (this.#cacheOptions.useTimeBoundedTTLSweep) {
            this.#timeBasedTTLVerification();
        } else {
            this.#countBasedTTLVerfication();
        }

        const end = Date.now();
        const elapsed = end - start;

        const delay = Math.max(this.#cacheOptions.ttlSweepTimeInMS - elapsed, 0);
        this.#intervalId = setTimeout(() => this.#sweep(), delay);
    }

    #countBasedTTLVerfication() {

        if (this.#ttlKeyStore.size === 0) {
            return;
        }

        const now = Date.now();
        
        for (let i = 0; i < this.#cacheOptions.ttlSweepWindowSize; i++) {
            const ttlNextIterator = this.#ttlIterator.next();

            if (ttlNextIterator.done) {
                this.#ttlIterator = this.#ttlKeyStore.keys();
                break;
            }

            const ttlNodeKey = ttlNextIterator.value;
            const nodeItf = this.#nodeMapper.get(ttlNodeKey);

            if (nodeItf?.ttl && nodeItf.ttl <= now) {
                this.delete(ttlNodeKey);
            }
        }
    }

    #timeBasedTTLVerification() {
        
        if (this.#ttlKeyStore.size === 0) {
            return;
        }

        const start = Date.now();
        const now = start;

        while (Date.now() - start < this.#cacheOptions.ttlSweepWindowDuration) {
            const ttlNextIterator = this.#ttlIterator.next();

            if (ttlNextIterator.done) {
                this.#ttlIterator = this.#ttlKeyStore.keys();
                break;
            }

            const ttlNodeKey = ttlNextIterator.value;
            const nodeItf = this.#nodeMapper.get(ttlNodeKey);

            if (nodeItf?.ttl && nodeItf.ttl <= now) {
                this.delete(ttlNodeKey);
            }
        }
    }

    public get(key: string): T | null {
        const now = Date.now();
        
        if (!this.#nodeMapper.has(key)) {
            return null;
        }
        
        const existingNode = this.#nodeMapper.get(key);

        if (existingNode?.ttl && existingNode.ttl <= now) {
            if (existingNode?.node?.data) {
                this.delete(existingNode.node.data.key);
            }
            return null;
        }
        
        this.#doublyLinkedList.unlinkNode(existingNode?.node!);
        this.#nodeMapper.delete(key);
        const newNode: DoublyLinkedListNode<LRUInternalType<T>> = this.#doublyLinkedList.pushAfterHead(existingNode?.node?.data!);

        const nodeItf: NodeMapperItf<T> = {
            node: newNode,
            ttl: existingNode?.ttl ?? null
        }
        
        this.#nodeMapper.set(key, nodeItf);
        return newNode.data?.value ?? null;
    }

    public put(key: string, value: T, ttl?: number): boolean {

        const now = Date.now();

        const lruInternalItf: LRUInternalType<T> = {
            key,
            value
        }

        let ttlToBeSet: number | null = null;

        if (this.#nodeMapper.has(key)) {
            const existingNode = this.#nodeMapper.get(key);
            if (existingNode?.ttl && existingNode.ttl <= now) {
                this.delete(key);
                return false;
            }
            this.#doublyLinkedList.unlinkNode(existingNode?.node!);
            this.#nodeMapper.delete(key);
            ttlToBeSet = existingNode?.ttl ?? null;
        } else if (this.#nodeMapper.size >= this.maxSize) {
            const poppedNode = this.#doublyLinkedList.popBeforeTail();
            if (poppedNode.data) {
                this.#nodeMapper.delete(poppedNode.data.key);
                this.#ttlKeyStore.delete(poppedNode.data.key);
                this.#ttlIterator = this.#ttlKeyStore.keys();
            }
        }

        // TTL is only set for new nodes, existing nodes must use the setTTL method to update their TTL.
        if (!this.#nodeMapper.has(key)) {
            if (ttl && ttl > 0) {
                ttlToBeSet = now + ttl;
            } else if (this.#cacheOptions.useDefaultTTL){
                ttlToBeSet = now + this.#cacheOptions.defaultTTLInMS;
            }
        }

        const newNode: DoublyLinkedListNode<LRUInternalType<T>> = this.#doublyLinkedList.pushAfterHead(lruInternalItf);

        const nodeItf: NodeMapperItf<T> = {
            node: newNode,
            ttl: ttlToBeSet
        }
        
        this.#nodeMapper.set(key, nodeItf);

        if (ttlToBeSet !== null) {
            this.#ttlKeyStore.add(key);
            this.#ttlIterator = this.#ttlKeyStore.keys();
        }

        return true;
    }

    public delete(key: string): boolean {
        
        if (this.#nodeMapper.has(key)) {
            
            const existingNode = this.#nodeMapper.get(key);
            
            this.#nodeMapper.delete(key);
            this.#ttlKeyStore.delete(key);
            if (existingNode) {
                this.#doublyLinkedList.unlinkNode(existingNode.node);
            }

            this.#ttlIterator = this.#ttlKeyStore.keys();
            
            return true;
        }
        
        return false;
    }

    // This function can be used to increase or decrease(by passing negative value in TTL) TTL of existing key's.
    public extendTTL(key: string, ttl: number): boolean {

        if (ttl <= 0) throw new Error('TTL can only be increased not decreaed. TTL must be positive non-zero');
        
        const now = Date.now();

        if (this.#nodeMapper.has(key)) {
            
            const existingNode = this.#nodeMapper.get(key);
            
            if (existingNode) {
                
                const newTTL = existingNode.ttl ? existingNode.ttl + ttl : now + ttl;

                const nodeItf: NodeMapperItf<T> = {
                    node: existingNode.node,
                    ttl: newTTL
                }
                
                this.#nodeMapper.set(key, nodeItf);
                
                if (!(this.#ttlKeyStore.has(key))) {
                    this.#ttlKeyStore.add(key);
                }

                this.#ttlIterator = this.#ttlKeyStore.keys();
                
                return true;
            }
        }
        
        return false;
    }

    public getTTL(key: string): number {
        return Math.max(0, (this.#nodeMapper.get(key)?.ttl ?? 0) - Date.now());
    }

    public getSize(): number {
        return this.#doublyLinkedList.getSize();
    }

    public getCapacity(): number {
        return this.maxSize;
    }

    public getOptions(): LRUCacheOptions {
        return this.#cacheOptions;
    }

    public flush() {
        this.#nodeMapper.clear();
        this.#ttlKeyStore.clear();
        this.#doublyLinkedList.clear();
        if (this.#intervalId) {
            clearTimeout(this.#intervalId);
        }
        this.#sweep();
    }

    // For loop is implemented using DLL so that LRU Cache's data is ordered based on most recent item first.
    *[Symbol.iterator]() {
        for (const node of this.#doublyLinkedList) {
            if (node && node.data) {
                yield Object.freeze({ 
                    key: node.data.key,
                    value: node.data.value,
                    ttl: this.#nodeMapper.get(node.data.key)?.ttl ?? null
                });
            }
        }
    }
}