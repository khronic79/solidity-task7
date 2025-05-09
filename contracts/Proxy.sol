// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.28;

interface ITransparentUpgradeableProxy {
    function upgradeTo(address newImplementation) external;
}

contract Proxy {

    address private _implementation;
    address private _admin;
    error ProxyDeniedAdminAccess();

    // При деплое передаем адрес имплементации
    // Для имплементации использую контракт MyERC20implimentation
    // Он отличается от MyERC20 тем, что в имплементации нет конструктора
    // А действия конструктора переносятся в функцию initialize
    constructor(address implementation) {
        _implementation = implementation;
        // Админом назначаем деплоера
        _admin = msg.sender;
    }

    // Содрал эту фунцию в OpenZeppelin
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

    // Ловит все вызовы к контракту
    // Т.к. открытых методов у этого контракта нет
    fallback() payable external {
        // Если вызов был от админа этого контракта,
        // Проверяем сигнатуру вызова
        // И если она соответствует
        // "function upgradeTo(address newImplementation)"
        // То вызываем _dispatchUpgradeTo() для смены имплементации
        if (msg.sender == _admin) {
            if (msg.sig != ITransparentUpgradeableProxy.upgradeTo.selector) {
                revert ProxyDeniedAdminAccess();
            } else {
                _dispatchUpgradeTo();
            }
        } else {
            // Если вызов был не от админа то вызываем имлементацию
            _delegate(_implementation);
        }
    }

    function _dispatchUpgradeTo() private {
        address newImplementation = abi.decode(msg.data[4:], (address));
        _implementation = newImplementation;
    }
}
