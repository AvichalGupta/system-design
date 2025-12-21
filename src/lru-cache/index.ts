import { DoublyLinkedList, DoublyLinkedListNode, MAX_SIZE } from "@avichal-gupta/dsa";

export class LRUCache<T> {
    private nodeMapper: Map<string, DoublyLinkedListNode<T>>;
    private doublyLinkedList: DoublyLinkedList<T>;

    private maxSize: number;
    constructor(maxSize: number = MAX_SIZE) {
        if (maxSize < 0) throw new Error('Max size cannot be negative')

        this.nodeMapper = new Map<string, DoublyLinkedListNode<T>>();
        this.doublyLinkedList = new DoublyLinkedList<T>({ maxSize });
        this.maxSize = maxSize || Number.MAX_SAFE_INTEGER;
    }

    public get(key: string): T | null {
        if (!this.nodeMapper.has(key)) {
            return null;
        }
        
        const existingNode = this.nodeMapper.get(key);
        this.doublyLinkedList.unlinkNode(existingNode!);
        this.nodeMapper.delete(key);
        const newNode: DoublyLinkedListNode<T> = this.doublyLinkedList.pushToFront(existingNode?.data!);
        this.nodeMapper.set(key, newNode);
        return newNode.data;
    }

    public put(key: string, value: T): void {
        if (this.nodeMapper.has(key)) {
            const existingNode = this.nodeMapper.get(key);
            this.doublyLinkedList.unlinkNode(existingNode!);
        } else if (this.nodeMapper.size >= this.maxSize) {
            this.doublyLinkedList.popFromBack();
        }
        this.nodeMapper.delete(key);
        const newNode: DoublyLinkedListNode<T> = this.doublyLinkedList.pushToFront(value);
        this.nodeMapper.set(key, newNode);
    }

    public getSize(): number {
        return this.doublyLinkedList.getSize();
    }

    public getCapacity(): number {
        return this.maxSize;
    }
}