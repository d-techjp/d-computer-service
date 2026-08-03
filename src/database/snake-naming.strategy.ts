import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

const snake = (value: string): string =>
    value
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .toLowerCase();

const pluralize = (value: string): string => {
    if (/(s|x|z|ch|sh)$/.test(value)) return `${value}es`;
    if (/[^aeiou]y$/.test(value)) return `${value.slice(0, -1)}ies`;
    return `${value}s`;
};

/**
 * Class/property viết camelCase trong TS -> table/column snake_case trong Postgres.
 * Tên bảng mặc định được số hoá số nhiều (User -> users, Category -> categories).
 */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    tableName(targetName: string, userSpecifiedName: string | undefined): string {
        return userSpecifiedName ?? pluralize(snake(targetName));
    }

    columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
        const prefix = embeddedPrefixes.map(snake).join('_');
        const name = customName || snake(propertyName);
        return prefix ? `${prefix}_${name}` : name;
    }

    relationName(propertyName: string): string {
        return snake(propertyName);
    }

    joinColumnName(relationName: string, referencedColumnName: string): string {
        return snake(`${relationName}_${referencedColumnName}`);
    }

    joinTableName(
        firstTableName: string,
        secondTableName: string,
        firstPropertyName: string,
    ): string {
        return snake(
            `${firstTableName}_${firstPropertyName.replace(/\./gi, '_')}_${secondTableName}`,
        );
    }

    joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
        return snake(`${tableName}_${columnName ?? propertyName}`);
    }

    classTableInheritanceParentColumnName(
        parentTableName: string,
        parentTableIdPropertyName: string,
    ) {
        return snake(`${parentTableName}_${parentTableIdPropertyName}`);
    }
}
