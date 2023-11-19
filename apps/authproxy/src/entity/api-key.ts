import "reflect-metadata";

import type { Scope } from "../auth/scope-permission.js";

import { v4 as uuidV4 } from "uuid";
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, Generated, CreateDateColumn } from "typeorm";

@Entity()
export class ApiKey extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @CreateDateColumn()
    public createdAt: Date;

    @Column({ default: "default" })
    public name: string;

    @Column({ default: false })
    public seen: boolean;

    @Column("int", { default: 5, width: 3 })
    public rateLimitPerWindow: number;

    @Column("text", { array: true, default: [] })
    public privilegedScopes: Scope[];

    @Column("timestamptz", { nullable: true })
    public lastUsed: Date | undefined;

    @Column("uuid", { unique: true, nullable: false })
    @Generated("uuid")
    public apiKey: string;

    public async roll(): Promise<string> {
        this.apiKey = uuidV4();
        this.lastUsed = undefined;
        await this.save();
        return this.apiKey;
    }
}

export default ApiKey;
