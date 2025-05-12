// SPDX-License-Identifier: UNLICENSED

import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { ERC1967Utils } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

pragma solidity 0.8.28;

contract MyProxy is ERC1967Proxy {

    error OnlyAdmin();
    error InsufficientBalance(uint256 balance, uint256 amount);
    error NotAcceptEtherDirectly();

    // При деплое передаем адрес имплементации
    // Для имплементации использую контракт MyERC20implimentation
    // Он отличается от MyERC20 тем, что в имплементации нет конструктора
    // А действия конструктора переносятся в функцию initialize
    constructor(address implementation, bytes memory _data) ERC1967Proxy(implementation, _data) {
        ERC1967Utils.changeAdmin(msg.sender);
    }

    // Модификатор, который контролирует исполнение функции только от имени админа
    modifier onlyAdmin {
        address ca = ERC1967Utils.getAdmin();
        if (msg.sender != ca) {
            revert OnlyAdmin();
        }
        _;
    }

    // Функция, меняющая админа
    function changeAdmin(address newAdmin) external onlyAdmin {
        ERC1967Utils.changeAdmin(newAdmin);
    }

    // Функция получения админа
    function getAdmin() external view returns (address admin) {
        return ERC1967Utils.getAdmin();
    }

    // Функция получения имплементации
    function getImpl() external view returns (address impl) {
        return _implementation();
    }

    // Функция установки новой имплементации
    function setImpl(address implementation) external onlyAdmin {
        ERC1967Utils.upgradeToAndCall(implementation, "");
    }

    // Запрет на передачу ether
    receive() external payable {
        revert NotAcceptEtherDirectly();
    }
}
