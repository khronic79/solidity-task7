// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract ContractForFactory {
    address public creator;
    string public name;

    constructor(string memory _name, address _creator) {
        creator = _creator;
        name = _name;
    }
}
