// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.28;

import "./MyERC20.sol";

interface ITransparentUpgradeableProxy {
    function upgradeTo(address newImplementation) external;
}

contract Proxy {

    address private _implementation;
    address private _admin;
    error ProxyDeniedAdminAccess();
    constructor(address implementation) {
        _implementation = implementation;
        _admin = msg.sender;
    }

    function _delegate(address implementation) internal {
        assembly {
            calldatacopy(0, 0, calldatasize())

            let result := delegatecall(
                gas(),
                implementation,
                0,
                calldatasize(),
                0,
                0
            )

            returndatacopy(0, 0, returndatasize())

            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    fallback() external {
        if (msg.sender == _admin) {
            if (msg.sig != ITransparentUpgradeableProxy.upgradeTo.selector) {
                revert ProxyDeniedAdminAccess();
            } else {
                _dispatchUpgradeTo();
            }
        } else {
            _delegate(_implementation);
        }
    }

    function _dispatchUpgradeTo() private {
        address newImplementation = abi.decode(msg.data[4:], (address));
        _implementation = newImplementation;
    }
}
