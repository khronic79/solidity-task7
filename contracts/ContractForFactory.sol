// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract ContractForFactory {
    address public creator;
    string public name;

    constructor(string memory _name) {
        creator = msg.sender;
        name = _name;
    }
}
