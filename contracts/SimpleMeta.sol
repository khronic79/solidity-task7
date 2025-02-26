// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract SimpleMeta {
    error InvalidSignature();

    bytes32 PERMIT_TYPE_HASH = keccak256(abi.encodePacked('SetValueWithSig(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'));

    bytes32 public DOMAIN_SEPARATOR;

    uint256 public value;

    mapping(address => uint256) public nonces;

    constructor() {
      DOMAIN_SEPARATOR = keccak256(
        abi.encode(
          keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
          keccak256('SimpleMeta'),
          keccak256('1'),
          block.chainid,
          address(this)
    ));
    }

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
            ))
          )
        );

        address signer = ecrecover(hash, v, r, s);

        if (signer != owner) {
            revert InvalidSignature();
        }
        value = newValue;
    }
}