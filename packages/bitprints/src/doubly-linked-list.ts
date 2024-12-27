import { LinkedListNode } from "./linked-list-node.js";

export class DoublyLinkedList<NodeData> {
    private _size: number;
    private _head: LinkedListNode<NodeData> | undefined;
    private _tail: LinkedListNode<NodeData> | undefined;

    public constructor(...elements: NodeData[]) {
        this._size = 0;
        this._head = undefined;
        this._tail = undefined;
        for (const element of elements) {
            this.append(element);
        }
    }

    public static from<T>(iterable: Iterable<T>): DoublyLinkedList<T> {
        return new DoublyLinkedList<T>(...iterable);
    }

    public get length(): number {
        return this._size;
    }

    public append(...elements: NodeData[]): DoublyLinkedList<NodeData> {
        for (const element of elements) {
            const node = new LinkedListNode<NodeData>(element, this._tail, undefined);
            if (this._head === undefined) {
                this._head = node;
            }
            if (this._tail !== undefined) {
                this._tail.next = node;
            }
            this._tail = node;
            this._size += 1;
        }
        return this;
    }

    public prepend(...elements: NodeData[]): DoublyLinkedList<NodeData> {
        const reverseElements = elements.reverse();
        for (const element of reverseElements) {
            const node = new LinkedListNode<NodeData>(element, undefined, this._head);
            if (this._tail === undefined) {
                this._tail = node;
            }
            if (this._head !== undefined) {
                this._head.previous = node;
            }
            this._head = node;
            this._size += 1;
        }
        return this;
    }

    public sort(compare: (a: NodeData, b: NodeData) => boolean): DoublyLinkedList<NodeData> {
        if (this._head === undefined || this._tail === undefined) {
            return this;
        }
        if (this.length < 2) {
            return this;
        }

        const quicksort = (start: LinkedListNode<NodeData>, end: LinkedListNode<NodeData>): void => {
            if (start === end) return;

            const pivotData = end.data;
            let current: LinkedListNode<NodeData> | undefined = start;
            let split: LinkedListNode<NodeData> = start;
            while (current && current !== end) {
                const sort = compare(current.data, pivotData);
                if (sort) {
                    if (current !== split) {
                        const temporary = split.data;
                        split.data = current.data;
                        current.data = temporary;
                    }
                    split = split.next!;
                }
                current = current.next;
            }
            end.data = split.data;
            split.data = pivotData;

            if (start.next === end.previous) {
                return;
            }

            if (split.previous && split !== start) {
                quicksort(start, split.previous);
            }
            if (split.next && split !== end) {
                quicksort(split.next, end);
            }
        };

        quicksort(this._head, this._tail);
        return this;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public iterate(function_: (data: NodeData) => unknown, reverse: boolean = false): void {
        let currentNode = reverse ? this._tail : this._head;
        const nextNode = reverse ? "previous" : "next";
        while (currentNode) {
            function_(currentNode.data);
            currentNode = currentNode[nextNode];
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public map(function_: (data: NodeData) => NodeData, reverse: boolean = false): DoublyLinkedList<NodeData> {
        const list = new DoublyLinkedList<NodeData>();
        this.iterate((data) => list.append(function_(data)), reverse);
        return list;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public filter(function_: (data: NodeData) => boolean, reverse: boolean = false): DoublyLinkedList<NodeData> {
        const list = new DoublyLinkedList<NodeData>();
        this.iterate((data) => {
            if (function_(data)) list.append(data);
        }, reverse);
        return list;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public some(function_: (data: NodeData) => boolean): boolean {
        let currentNode = this._head;
        while (currentNode) {
            if (function_(currentNode.data)) return true;
            currentNode = currentNode.next;
        }
        return false;
    }

    public *[Symbol.iterator](): IterableIterator<NodeData> {
        let element = this._head;
        while (element !== undefined) {
            yield element.data;
            element = element.next;
        }
    }
}
