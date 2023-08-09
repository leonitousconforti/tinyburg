class DecisionTreeNode<NodeName extends string, ParentNodeNames extends string[] = [NodeName]> {
    private readonly _name: NodeName;

    public constructor(name: NodeName) {
        this._name = name;
    }

    public addDecision<
        DecisionNodeName extends string,
        DecisionNodeParentNames extends string[],
        ParentNodeName extends ParentNodeNames[number],
        DecisionNode extends DecisionTreeNode<DecisionNodeName, DecisionNodeParentNames>
    >({
        decision,
        outcome,
    }: {
        decision: string;
        outcome: DecisionNode | ParentNodeName;
    }): DecisionTreeNode<NodeName, ParentNodeNames> {
        return this;
    }
}

const rebuildEvery50FloorsStrategy = new DecisionTreeNode("Start")
    .addDecision({ decision: "Can't buy next floor?", outcome: "Start" })
    .addDecision({
        decision: "Can buy next floor?",
        outcome: new DecisionTreeNode("Buy Floor")
            .addDecision({ decision: "Can't unlock an elevator", outcome: "Start" })
            .addDecision({ decision: "can unlock an elevator", outcome: new DecisionTreeNode("a") }),
    });

//
//
//
//
//
//

export type Action = "Do this" | "Do that" | "But never do this!";
export type Node<NodeName extends string, NodeParentNames extends string[] = [NodeName]> = {
    nodeName: NodeName;
    actions?: Action[];
    decisions: Expression<string, NodeParentNames>[];
};
export type Expression<NodeName extends string, NodeParentNames extends string[]> = () =>
    | Node<NodeName, NodeParentNames>
    | NodeParentNames[number]
    | undefined;

const test = {
    nodeName: "Start",
    decisions: [
        () => ({
            nodeName: "Can't buy next floor",
            decisions: [() => "Start"],
        }),
        () => ({
            nodeName: "Can buy next floor",
            actions: ["Do that"],
            decisions: [
                () => ({
                    nodeName: "Can't unlock elevator",
                    decisions: [() => "Start"],
                }),
                () => ({
                    nodeName: "Can unlock elevator",
                    actions: ["Do that"],
                    decisions: [() => "Can buy next floor"],
                }),
            ],
        }),
    ],
} satisfies Node<"Start">;
