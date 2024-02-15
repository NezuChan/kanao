import { common, modules, node, extend, stylistic, ignores, typescript } from "@hazmi35/eslint-config";

export default [
    ...extend(common, [
        {
            rule: "id-length",
            option: ["off"]
        },
        {
            rule: "no-return-assign",
            option: ["off"]
        },
        {
            rule: "new-cap",
            option: ["off"]
        },
        {
            rule: "no-await-in-loop",
            option: ["off"]
        },
        {
            rule: "unicorn/custom-error-definition",
            option: ["off"]
        },
        {
            rule: "tsdoc/syntax",
            option: ["off"]
        },
        {
            rule: "stylistic/max-len",
            option: ["off"]
        },
        {
            rule: "promise/prefer-await-to-callbacks",
            option: ["off"]
        },
        {
            rule: "unicorn/no-object-as-default-parameter",
            option: ["off"]
        }
    ]),
    ...modules,
    ...node,
    ...stylistic,
    ...extend(typescript, [
        {
            rule: "@typescript-eslint/no-unnecessary-condition",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/no-unsafe-declaration-merging",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/no-base-to-string",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/naming-convention",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/no-unsafe-assignment",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/class-literal-property-style",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/no-unsafe-return",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/no-confusing-void-expression",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/no-unsafe-call",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/no-unsafe-member-access",
            option: ["off"]
        },
        {
            rule: "@typescript-eslint/strict-boolean-expressions",
            option: ["off"]
        }
    ]),
    ...ignores
];
