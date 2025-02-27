// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Это простой контракт для демонстрации работы EIP-712
// Или использования мета транзации
// Он меняет значение переменной value через функцию setValueWithSig
// Которая выполняется через делигирование
contract SimpleMeta {
    error InvalidSignature();

    bytes32 PERMIT_TYPE_HASH =
        keccak256(
            "SetValueWithSig(address owner,address spender,uint256 value,uint256 nonce)"
        );

    bytes32 public DOMAIN_SEPARATOR;

    uint256 public value;

    mapping(address => uint256) public nonces;

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("SimpleMeta"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }
    // Не предусмотрен дедлайн для упрощения
    function setValueWithSig(
        address owner,
        address spender,
        uint256 newValue,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        bytes32 hash = keccak256(
            abi.encodePacked(
                hex"1901",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        PERMIT_TYPE_HASH,
                        owner,
                        spender,
                        newValue,
                        nonces[owner]++
                    )
                )
            )
        );

        address signer = ecrecover(hash, v, r, s);

        if (signer != owner) {
            revert InvalidSignature();
        }
        value = newValue;
    }
}
