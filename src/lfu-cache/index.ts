import { DoublyLinkedList, DoublyLinkedListNode, MAX_SIZE } from "@avichal-gupta/dsa";

interface LFUInternalType<T> {
    key: string
    value: T
    frequency: number
}

export class LFUCache<T> {
    #nodeMapper: Map<string, DoublyLinkedListNode<LFUInternalType<T>>>;
    #frequencyBucketMapper: Map<number, DoublyLinkedList<LFUInternalType<T>>>;
    #minFreq: number;
    #maxSize: number;
    
    constructor(maxSize: number = MAX_SIZE) {
        if (maxSize <= 0) throw new Error('Max size must be greater than 0')

        this.#nodeMapper = new Map<string, DoublyLinkedListNode<LFUInternalType<T>>>();
        this.#frequencyBucketMapper = new Map<number, DoublyLinkedList<LFUInternalType<T>>>();
        this.#maxSize = maxSize || MAX_SIZE;
        this.#minFreq = 1;
    }

    public get(key: string): T | null {
        if (!this.#nodeMapper.has(key)) {
            return null;
        }
        
        const existingNode = this.#nodeMapper.get(key);
        const frequencyValue = existingNode?.data?.frequency || 1;
        
        const existingFrequencyBucket = this.#frequencyBucketMapper.get(frequencyValue);
        if (existingFrequencyBucket) {
            existingFrequencyBucket.unlinkNode(existingNode!);
        }

        const lfuInternalItf: LFUInternalType<T> = {
            key,
            value: existingNode?.data?.value!,
            frequency: frequencyValue + 1
        }

        const nextFrequencyBucket = this.#frequencyBucketMapper.get(lfuInternalItf.frequency);
        const tempDLL = nextFrequencyBucket ?? new DoublyLinkedList<LFUInternalType<T>>();
        const newNode = tempDLL.pushAfterHead(lfuInternalItf);

        if (!nextFrequencyBucket) {
            this.#frequencyBucketMapper.set(lfuInternalItf.frequency, tempDLL);
        }
        
        this.#nodeMapper.delete(key);
        this.#nodeMapper.set(key, newNode);

        if (frequencyValue === this.#minFreq && existingFrequencyBucket?.getSize() === 0) {
            this.#minFreq = lfuInternalItf.frequency;
        }

        return newNode.data?.value ?? null;
    }

    public put(key: string, value: T): void {
        if (this.#nodeMapper.has(key)) {
            
            const existingNode = this.#nodeMapper.get(key);
            const frequencyValue = existingNode?.data?.frequency || 1;

            const existingFrequencyBucket = this.#frequencyBucketMapper.get(frequencyValue);
            if (existingFrequencyBucket) {
                existingFrequencyBucket.unlinkNode(existingNode!);
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
            this.#nodeMapper.set(key, newNode);

            if (frequencyValue === this.#minFreq && existingFrequencyBucket?.getSize() === 0) {
                this.#minFreq = lfuInternalItf.frequency;
            }

        } else if (this.#nodeMapper.size >= this.#maxSize) {
            
            const existingFrequencyBucket = this.#frequencyBucketMapper.get(this.#minFreq);
            if (existingFrequencyBucket) {
                const poppedNode = existingFrequencyBucket.popBeforeTail();
                this.#nodeMapper.delete(poppedNode.data?.key!);
            }

            const lruInternalItf: LFUInternalType<T> = {
                key,
                value,
                frequency: 1
            }

            const nextFrequencyBucket = this.#frequencyBucketMapper.get(1);
            const tempDLL = nextFrequencyBucket ?? new DoublyLinkedList<LFUInternalType<T>>();
            const newNode = tempDLL.pushAfterHead(lruInternalItf);

            if (!nextFrequencyBucket) {
                this.#frequencyBucketMapper.set(1, tempDLL);
            }
            
            this.#nodeMapper.delete(key);
            this.#nodeMapper.set(key, newNode);

            this.#minFreq = 1;
        } else {
            const lruInternalItf: LFUInternalType<T> = {
                key,
                value,
                frequency: 1
            }

            const nextFrequencyBucket = this.#frequencyBucketMapper.get(1);
            const tempDLL = nextFrequencyBucket ?? new DoublyLinkedList<LFUInternalType<T>>();
            const newNode = tempDLL.pushAfterHead(lruInternalItf);

            if (!nextFrequencyBucket) {
                this.#frequencyBucketMapper.set(1, tempDLL);
            }
            
            this.#nodeMapper.delete(key);
            this.#nodeMapper.set(key, newNode);
            
            this.#minFreq = 1;
        }

    }

    public getSize(): number {
        return this.#nodeMapper.size;
    }

    public getCapacity(): number {
        return this.#maxSize;
    }

    public flush() {
        this.#nodeMapper.clear();
        this.#frequencyBucketMapper.clear();
    }
}