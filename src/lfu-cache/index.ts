import { DoublyLinkedList, DoublyLinkedListNode, MAX_SIZE } from "@avichal-gupta/dsa";

interface LFUInternalType<T> {
    key: string
    value: T
    frequency: number
}

interface NodeMapperItf<T> { 
    node: DoublyLinkedListNode<LFUInternalType<T>>, 
    ttl: number | null 
}

export interface LFUCacheOptions {
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

export class LFUCache<T> {
    // Stores nodes mapped with key for constant time lookups, the nodes are used in DLL operations.
    #nodeMapper: Map<string, NodeMapperItf<T>>;

    // Stores a DLL for every entry, where each key represents a frequency value and each value represents a node that has frequency as the key.
    #frequencyBucketMapper: Map<number, DoublyLinkedList<LFUInternalType<T>>>;

    // Stores key of nodes with TTL mapped for constant time lookups, the keys are used to fetch nodes and ttl information from the #nodeMapper.
    #ttlKeyStore: Set<string>;

    // Stores a list of iterators that must be used to verify TTL, this is needed to avoid re-running the TTL Sweeps on the same set of keys everytime.
    #ttlIterator: MapIterator<string>;
    
    // Stores cache options
    #cacheOptions: LFUCacheOptions;

    #intervalId: number;
    
    #minFreq: number;
    #maxSize: number;
    
    constructor(ops?: LFUCacheOptions) {

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

        this.#maxSize = ops?.maxSize || MAX_SIZE;
        this.#nodeMapper = new Map<string, NodeMapperItf<T>>();
        this.#ttlKeyStore = new Set<string>();
        this.#ttlIterator = this.#ttlKeyStore.keys();        
        this.#frequencyBucketMapper = new Map<number, DoublyLinkedList<LFUInternalType<T>>>();
        this.#intervalId = 0;
        this.#minFreq = 1;
        
        this.#sweep();
    }


    validateCacheOptions(opts: LFUCacheOptions) {
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
                if (opts.ttlSweepWindowDuration > opts.ttlSweepTimeInMS) {
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

        const start = performance.now();

        if (this.#cacheOptions.useTimeBoundedTTLSweep) {
            this.#timeBasedTTLVerification();
        } else {
            this.#countBasedTTLVerfication();
        }

        const end = performance.now();
        const elapsed = end - start;

        const delay = Math.max(this.#cacheOptions.ttlSweepTimeInMS - elapsed, 0);
        this.#intervalId = setTimeout(() => this.#sweep(), delay);
    }

    #countBasedTTLVerfication() {

        if (this.#ttlKeyStore.size === 0) {
            return;
        }

        const now = performance.timeOrigin + performance.now();
        
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

        const start = performance.now();
        const now = performance.timeOrigin + start;

        while (performance.now() - start < this.#cacheOptions.ttlSweepWindowDuration) {
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
        const now = performance.timeOrigin + performance.now();

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
        
        const frequencyValue = existingNode?.node?.data?.frequency || 1;
        
        const existingFrequencyBucket = this.#frequencyBucketMapper.get(frequencyValue);
        if (existingFrequencyBucket) {
            existingFrequencyBucket.unlinkNode(existingNode?.node!);
            if (existingFrequencyBucket.getSize() === 0) {
                this.#frequencyBucketMapper.delete(existingNode?.node?.data?.frequency!);
                if (this.#minFreq === existingNode?.node?.data?.frequency!) this.#minFreq++;
            }
        }

        const lfuInternalItf: LFUInternalType<T> = {
            key,
            value: existingNode?.node?.data?.value!,
            frequency: frequencyValue + 1
        }

        const nextFrequencyBucket = this.#frequencyBucketMapper.get(lfuInternalItf.frequency);
        const tempDLL = nextFrequencyBucket ?? new DoublyLinkedList<LFUInternalType<T>>();
        const newNode = tempDLL.pushAfterHead(lfuInternalItf);

        if (!nextFrequencyBucket) {
            this.#frequencyBucketMapper.set(lfuInternalItf.frequency, tempDLL);
        }
        
        this.#nodeMapper.delete(key);

        const nodeItf: NodeMapperItf<T> = {
            ttl: existingNode?.ttl ?? null,
            node: newNode
        }
        
        this.#nodeMapper.set(key, nodeItf);

        if (frequencyValue === this.#minFreq && existingFrequencyBucket?.getSize() === 0) {
            this.#minFreq = lfuInternalItf.frequency;
        }

        return newNode.data?.value ?? null;
    }

    public put(key: string, value: T, ttl?: number): boolean {
        const now = performance.timeOrigin + performance.now();

        let ttlToBeSet: number | null = null;

        if (this.#nodeMapper.has(key)) {
            
            const existingNode = this.#nodeMapper.get(key);
            
            if (existingNode?.ttl && existingNode.ttl <= now) {
                if (existingNode?.node?.data) {
                    this.delete(existingNode.node.data.key);
                }
                return false;
            }
        
            const frequencyValue = existingNode?.node?.data?.frequency || 1;

            ttlToBeSet = existingNode?.ttl ?? null;

            const existingFrequencyBucket = this.#frequencyBucketMapper.get(frequencyValue);
            if (existingFrequencyBucket) {
                existingFrequencyBucket.unlinkNode(existingNode?.node!);
                if (existingFrequencyBucket.getSize() === 0) {
                    this.#frequencyBucketMapper.delete(existingNode?.node?.data?.frequency!);
                    if (this.#minFreq === existingNode?.node?.data?.frequency!) this.#minFreq++;
                }
            }

            const lfuInternalItf: LFUInternalType<T> = {
                key,
                value,
                frequency: frequencyValue + 1
            }

            const nextFrequencyBucket = this.#frequencyBucketMapper.get(lfuInternalItf.frequency);
            const tempDLL = nextFrequencyBucket ?? new DoublyLinkedList<LFUInternalType<T>>();
            const newNode = tempDLL.pushAfterHead(lfuInternalItf);

            if (!nextFrequencyBucket) {
                this.#frequencyBucketMapper.set(lfuInternalItf.frequency, tempDLL);
            }
            
            this.#nodeMapper.delete(key);

            const nodeItf: NodeMapperItf<T> = {
                ttl: ttlToBeSet,
                node: newNode
            }

            this.#nodeMapper.set(key, nodeItf);

            if (frequencyValue === this.#minFreq && existingFrequencyBucket?.getSize() === 0) {
                this.#minFreq = lfuInternalItf.frequency;
            }

        } else if (this.#nodeMapper.size >= this.#maxSize) {
            
            const existingFrequencyBucket = this.#frequencyBucketMapper.get(this.#minFreq);
            if (existingFrequencyBucket) {
                const poppedNode = existingFrequencyBucket.popBeforeTail();
                this.#nodeMapper.delete(poppedNode.data?.key!);
                this.#ttlKeyStore.delete(poppedNode.data?.key!);
                this.#ttlIterator = this.#ttlKeyStore.keys();
            }

            const lruInternalItf: LFUInternalType<T> = {
                key,
                value,
                frequency: 1
            }

            // TTL is only set for new nodes, existing nodes must use the setTTL method to update their TTL.
            if (ttl && ttl > 0) {
                ttlToBeSet = now + ttl;
            } else if (this.#cacheOptions.useDefaultTTL){
                ttlToBeSet = now + this.#cacheOptions.defaultTTLInMS;
            }

            const nextFrequencyBucket = this.#frequencyBucketMapper.get(1);
            const tempDLL = nextFrequencyBucket ?? new DoublyLinkedList<LFUInternalType<T>>();
            const newNode = tempDLL.pushAfterHead(lruInternalItf);

            if (!nextFrequencyBucket) {
                this.#frequencyBucketMapper.set(1, tempDLL);
            }
            
            this.#nodeMapper.delete(key);
            
            const nodeItf: NodeMapperItf<T> = {
                ttl: ttlToBeSet,
                node: newNode
            }

            this.#nodeMapper.set(key, nodeItf);

            if (ttlToBeSet !== null) {
                this.#ttlKeyStore.add(key);
                this.#ttlIterator = this.#ttlKeyStore.keys();
            }

            this.#minFreq = 1;
        } else {
            const lruInternalItf: LFUInternalType<T> = {
                key,
                value,
                frequency: 1
            }

            // TTL is only set for new nodes, existing nodes must use the setTTL method to update their TTL.
            let ttlToBeSet = null;
            if (ttl && ttl > 0) {
                ttlToBeSet = now + ttl;
            } else if (this.#cacheOptions.useDefaultTTL){
                ttlToBeSet = now + this.#cacheOptions.defaultTTLInMS;
            }

            const nextFrequencyBucket = this.#frequencyBucketMapper.get(1);
            const tempDLL = nextFrequencyBucket ?? new DoublyLinkedList<LFUInternalType<T>>();
            const newNode = tempDLL.pushAfterHead(lruInternalItf);

            if (!nextFrequencyBucket) {
                this.#frequencyBucketMapper.set(1, tempDLL);
            }
            
            this.#nodeMapper.delete(key);

            const nodeItf: NodeMapperItf<T> = {
                ttl:ttlToBeSet,
                node: newNode
            }

            this.#nodeMapper.set(key, nodeItf);

            if (ttlToBeSet !== null) {
                this.#ttlKeyStore.add(key);
                this.#ttlIterator = this.#ttlKeyStore.keys();
            }
            
            this.#minFreq = 1;
        }

        return true;

    }

    public delete(key: string): boolean {
        
        if (this.#nodeMapper.has(key)) {
            
            const existingNode = this.#nodeMapper.get(key);
            
            this.#nodeMapper.delete(key);
            this.#ttlKeyStore.delete(key);
            if (existingNode) {
                const dll = this.#frequencyBucketMapper.get(existingNode.node.data?.frequency!);
                if (dll) {
                    dll.unlinkNode(existingNode.node);
                    if (dll.getSize() === 0) {
                        this.#frequencyBucketMapper.delete(existingNode.node.data?.frequency!);
                        if (this.#minFreq === existingNode.node.data?.frequency!) this.#minFreq++;
                    }
                }
            }

            this.#ttlIterator = this.#ttlKeyStore.keys();
            
            return true;
        }
        
        return false;
    }

    // This function can be used to increase or decrease(by passing negative value in TTL) TTL of existing key's.
    public extendTTL(key: string, ttl: number): boolean {

        if (ttl <= 0) throw new Error('TTL can only be increased not decreaed. TTL must be positive non-zero');
        
        const now = performance.timeOrigin + performance.now();

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

    public getSize(): number {
        return this.#nodeMapper.size;
    }

    public getCapacity(): number {
        return this.#maxSize;
    }
   
    public getOptions(): LFUCacheOptions {
        return this.#cacheOptions;
    }
   
    public flush() {
        this.#nodeMapper.clear();
        this.#ttlKeyStore.clear();
        this.#frequencyBucketMapper.clear();
        if (this.#intervalId) {
            clearTimeout(this.#intervalId);
        }
        this.#sweep();
    }

    *[Symbol.iterator]() {
        // For loop is implemented using freqMap -> DLL loops so that LFU Cache's data is ordered based on frequency buckets + recency.
        for (const dll of this.#frequencyBucketMapper.values()) {
            if (dll) {
                 for (const nodeVal of dll) {
                    yield Object.freeze({ 
                        key: nodeVal?.data?.key,
                        value: nodeVal?.data?.value,
                        frequency: nodeVal?.data?.frequency,
                        ttl: this.#nodeMapper.get(nodeVal?.data?.key!)?.ttl ?? null
                    });
                }
            }
        }
    }
}