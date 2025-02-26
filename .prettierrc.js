module.exports = {
    plugins: [require.resolve("prettier-plugin-solidity")],
    overrides: [
        {
            files: "*.sol",
            options: {
                printWidth: 80,
                tabWidth: 4,
                useTabs: false,
                singleQuote: false,
                bracketSpacing: false,
            },
        },
    ],
};
