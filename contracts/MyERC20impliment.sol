// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

// Контракт аналогичен контракту MyERC20
// Но в нем нет конструктора
// Действия из контруктора перенесены в функцию initialize
// Этот контракт будет использоваться в качестве имплементации для Proxy
// Наследание производится от ERC20Upgradeable и AccessControlUpgradeable
contract MyERC20impliment is ERC20Upgradeable, AccessControlUpgradeable {
    error EIP2612PermisssionExpired(uint256 deadline);
    error EIP2612InvalidSignature(address owner, address signer);
    error InitializeOnlyByInitializer();
    event ChangeMinter(address oldMinter, address newMinter);
    event ChangeBurner(address oldBurner, address newBurner);

    address public constant INITIALIZER_ADDRESS = 0x5c8630069c6663e7Fa3eAAAB562e2fF4419e12f7;
    
    // Константы записываются в байткод контракта и не требуют выделение отдельного пространства в Storage
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    bytes32 public constant PERMIT_TYPE_HASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );
    
    // Добавлен уникальный адрес для отделения пространства под кастомные дополнительные данные контракта в Storage
    // keccak256(abi.encode(uint256(keccak256("add.storage")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant _ADDITIONAL_STORAGE_SLOT = 0x4881443614f2808694476683de7e04cb858b07f694ef0a8994a657573f4deb00;

    // Добавлена структура данных, которая будет развернута на выделенном пространстве
    struct AddStorage {
        address currentMinter;
        address currentBurner;
        bytes32 DOMAIN_SEPARATOR;
        mapping(address account => uint256) nonces;
    }

    modifier onlyInitializer {
        if (msg.sender != INITIALIZER_ADDRESS) {
            revert InitializeOnlyByInitializer();
        }
        _;
    }

    // Добавлена функция для получения данных из выделенного пространства в Storage
    function _getAddStorage() private pure returns (AddStorage storage $) {
        assembly {
            $.slot := _ADDITIONAL_STORAGE_SLOT
        }
    }

    // Добавлена функция получения нонса
    function nonces(address account) external view returns (uint256 nonce){
        return _getAddStorage().nonces[account];
    }

    // Инициализация контракта для настройки стора Proxy
    // Добавлен модификатор initializer для контроля единоразового запуска этой функции
    function initialize() external initializer onlyInitializer {
        AddStorage storage $ = _getAddStorage();
        __ERC20_init("My test token", "MTT");
        $.currentBurner = address(0);
        $.currentMinter = address(0);
        address admin = msg.sender;
        _mint(admin, 1_000_000 ether);
        _grantRole(ADMIN_ROLE, admin);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);

        $.DOMAIN_SEPARATOR = keccak256(
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

    // Может быть только один минтер
    function changeMinter(address minter) external {
        AddStorage storage $ = _getAddStorage();
        address cm = $.currentMinter;
        if (cm != address(0)) {
            revokeRole(MINTER_ROLE, cm);
        }
        grantRole(MINTER_ROLE, minter);
        $.currentMinter = minter;
        emit ChangeMinter(cm, minter);
    }

    // Может быть только один бернер
    function changeBurner(address burner) external {
        AddStorage storage $ = _getAddStorage();
        address cb = $.currentBurner;
        if (cb != address(0)) {
            revokeRole(BURNER_ROLE, cb);
        }
        grantRole(BURNER_ROLE, burner);
        $.currentBurner = burner;
        emit ChangeBurner(cb, burner);
    }

    function mint(
        address account,
        uint256 value
    ) external onlyRole(MINTER_ROLE) {
        _mint(account, value);
    }

    function burn(
        address account,
        uint256 value
    ) external onlyRole(BURNER_ROLE) {
        _burn(account, value);
    }

    function permit(
        address owner,
        address spender,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        AddStorage storage $ = _getAddStorage();
        if (deadline < block.timestamp) {
            revert EIP2612PermisssionExpired(deadline);
        }

        bytes32 hash = keccak256(
            abi.encodePacked(
                hex"1901",
                $.DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        PERMIT_TYPE_HASH,
                        owner,
                        spender,
                        amount,
                        $.nonces[owner]++,
                        deadline
                    )
                )
            )
        );

        address signer = ecrecover(hash, v, r, s);

        if (signer != owner) {
            revert EIP2612InvalidSignature(owner, signer);
        }
        _approve(owner, spender, amount);
    }
}
