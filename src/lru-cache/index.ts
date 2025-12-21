import { DoublyLinkedList, DoublyLinkedListNode, MAX_SIZE } from "@avichal-gupta/dsa";

interface LRUInternalType<T> {
    key: string
    value: T
}
export class LRUCache<T> {
    private nodeMapper: Map<string, DoublyLinkedListNode<LRUInternalType<T>>>;
    private doublyLinkedList: DoublyLinkedList<LRUInternalType<T>>;

    private maxSize: number;
    constructor(maxSize: number = MAX_SIZE) {
        if (maxSize < 0) throw new Error('Max size cannot be negative')

        this.nodeMapper = new Map<string, DoublyLinkedListNode<LRUInternalType<T>>>();
        this.doublyLinkedList = new DoublyLinkedList<LRUInternalType<T>>({ maxSize });
        this.maxSize = maxSize || Number.MAX_SAFE_INTEGER;
    }

    public get(key: string): T | null {
        if (!this.nodeMapper.has(key)) {
            return null;
        }
        
        const existingNode = this.nodeMapper.get(key);
        this.doublyLinkedList.unlinkNode(existingNode!);
        this.nodeMapper.delete(key);
        const newNode: DoublyLinkedListNode<LRUInternalType<T>> = this.doublyLinkedList.pushToFront(existingNode?.data!);
        this.nodeMapper.set(key, newNode);
        return newNode.data?.value ?? null;
    }

    public put(key: string, value: T): void {
        if (this.nodeMapper.has(key)) {
            const existingNode = this.nodeMapper.get(key);
            this.doublyLinkedList.unlinkNode(existingNode!);
        } else if (this.nodeMapper.size >= this.maxSize) {
            const poppedNode = this.doublyLinkedList.popFromBack();
            if (poppedNode.data) {
                this.nodeMapper.delete(poppedNode.data.key);
            }
        }
        this.nodeMapper.delete(key);
        const lruInternalItf: LRUInternalType<T> = {
            key,
            value
        }
        const newNode: DoublyLinkedListNode<LRUInternalType<T>> = this.doublyLinkedList.pushToFront(lruInternalItf);
        this.nodeMapper.set(key, newNode);
    }

    public getSize(): number {
        return this.doublyLinkedList.getSize();
    }

    public getCapacity(): number {
        return this.maxSize;
    }

    public flush() {
        this.nodeMapper.clear();
        this.doublyLinkedList.clear();
    }
}