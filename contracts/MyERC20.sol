// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
// Определяем контракт MyERC20 и сразу задаем ему имя и символ
// Также наследуем в него управление доступами
contract MyERC20 is ERC20("My test token", "MTT"), AccessControl {
    error EIP2612PermisssionExpired(uint256 deadline);
    error EIP2612InvalidSignature(address owner, address signer);
    
    // Определяем роли
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // Задаем первоначальные адреса для минтера и бурнера
    address currentMinter = address(0);
    address currentBurner = address(0);

    // Определяем тип подписи
    bytes32 public constant PERMIT_TYPE_HASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    bytes32 public DOMAIN_SEPARATOR;

    mapping(address account => uint256) public nonces;

    constructor() {
        address sender = msg.sender;
        // При деплое минтим на создателя 1_000_000 токенов
        _mint(sender, 1_000_000 ether);
        // Назнаяем админку создателю
        _grantRole(ADMIN_ROLE, sender);
        // Назначаем роль управления назначениями минтера и бурнера
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);
        // Генерируем сепаратор
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("My test token"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }
    // В логике настоящего контракта
    // может быть назначен только один минтер
    // При назначении нового минтера
    // удаляем роль управления минтингом у предыдущего минтера
    function changeMinter(address minter) external {
        address cm = currentMinter;
        if (cm != address(0)) {
            revokeRole(MINTER_ROLE, cm);
        }
        grantRole(MINTER_ROLE, minter);
        currentMinter = minter;
    }

    // По аналогии с управлением ролью минтера
    function changeBurner(address burner) external {
        address cb = currentBurner;
        if (cb != address(0)) {
            revokeRole(MINTER_ROLE, cb);
        }
        grantRole(BURNER_ROLE, burner);
        currentBurner = burner;
    }
    // Минтим токены только ролью минтера
    function mint(
        address account,
        uint256 value
    ) external onlyRole(MINTER_ROLE) {
        _mint(account, value);
    }
    // Берним токены только ролью бернера
    function burn(
        address account,
        uint256 value
    ) external onlyRole(BURNER_ROLE) {
        _burn(account, value);
    }
    // Стандартная функция permit
    function permit(
        address owner,
        address spender,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Проверяем, что дедлайн не прошел
        if (deadline < block.timestamp) {
            revert EIP2612PermisssionExpired(deadline);
        }
        // Генерируем хеш
        bytes32 hash = keccak256(
            abi.encodePacked(
                hex"1901",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        PERMIT_TYPE_HASH,
                        owner,
                        spender,
                        amount,
                        nonces[owner]++,
                        deadline
                    )
                )
            )
        );
        // Вычисляем адрес подписи
        address signer = ecrecover(hash, v, r, s);
        // Проверяем, что адрес подписи совпадает с адресом владельца
        if (signer != owner) {
            revert EIP2612InvalidSignature(owner, signer);
        }
        // Подтверждаем
        _approve(owner, spender, amount);
    }
}
