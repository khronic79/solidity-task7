// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./ContractForFactory.sol";

contract Factory {
    address[] public deployedContracts;

    function createContract(string memory _name) public {
        ContractForFactory newContract = new ContractForFactory(_name);
        deployedContracts.push(address(newContract));
    }

    function getDeployedContracts() public view returns (address[] memory) {
        return deployedContracts;
    }
}