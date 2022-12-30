import type { Scope } from "../auth/scopePermission.js";

import { v4 as uuidv4 } from "uuid";
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, Generated, CreateDateColumn } from "typeorm";

@Entity()
export class ApiKey extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ default: "default" })
    name: string;

    @Column({ default: false })
    seen: boolean;

    @Column("int", { default: 5, width: 3 })
    rateLimitPerWindow: number;

    @Column("text", { array: true, default: [] })
    privilegedScopes: Scope[];

    @Column("timestamptz", { nullable: true })
    lastUsed: Date | null;

    @Column("uuid", { unique: true, nullable: false })
    @Generated("uuid")
    apiKey: string;

    async roll(): Promise<string> {
        this.apiKey = uuidv4();
        this.lastUsed = null;
        await this.save();
        return this.apiKey;
    }
}
