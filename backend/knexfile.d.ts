export namespace development {
    let client: string;
    namespace connection {
        let connectionString: string;
        let ssl: boolean;
    }
    namespace migrations {
        let directory: string;
        let tableName: string;
    }
    namespace seeds {
        let directory_1: string;
        export { directory_1 as directory };
    }
}
export namespace production {
    let client_1: string;
    export { client_1 as client };
    export namespace connection_1 {
        let connectionString_1: string;
        export { connectionString_1 as connectionString };
        export namespace ssl_1 {
            let rejectUnauthorized: boolean;
        }
        export { ssl_1 as ssl };
    }
    export { connection_1 as connection };
    export namespace migrations_1 {
        let directory_2: string;
        export { directory_2 as directory };
        let tableName_1: string;
        export { tableName_1 as tableName };
    }
    export { migrations_1 as migrations };
    export namespace pool {
        let min: number;
        let max: number;
    }
}
export namespace test {
    let client_2: string;
    export { client_2 as client };
    export namespace connection_2 {
        let connectionString_2: string;
        export { connectionString_2 as connectionString };
    }
    export { connection_2 as connection };
    export namespace migrations_2 {
        let directory_3: string;
        export { directory_3 as directory };
        let tableName_2: string;
        export { tableName_2 as tableName };
    }
    export { migrations_2 as migrations };
}
//# sourceMappingURL=knexfile.d.ts.map