/** Represents one link or node in a linked list */
export class LinkedListNode<NodeData> {
    /** Data stored on the node */
    public data: NodeData;

    /** The previous node in the list */
    public previous: LinkedListNode<NodeData> | undefined;

    /** The next link in the list */
    public next: LinkedListNode<NodeData> | undefined;

    public constructor(
        data: NodeData,
        previous: LinkedListNode<NodeData> | undefined,
        next: LinkedListNode<NodeData> | undefined
    ) {
        this.data = data;
        this.previous = previous;
        this.next = next;
    }
}
