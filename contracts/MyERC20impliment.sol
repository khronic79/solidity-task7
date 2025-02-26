// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
contract MyERC20impliment is ERC20("My test token", "MTT"), AccessControl {
    error EIP2612PermisssionExpired(uint256 deadline);
    error EIP2612InvalidSignature(address owner, address signer);
    bool public initialized = false;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    address currentMinter = address(0);
    address currentBurner = address(0);

    bytes32 public constant PERMIT_TYPE_HASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    bytes32 public DOMAIN_SEPARATOR;

    mapping(address account => uint256) public nonces;

    function initialize() external {
        if (initialized) {
            revert("Already initialized");
        }
        address admin = msg.sender;
        _mint(admin, 1_000_000 ether);
        _grantRole(ADMIN_ROLE, admin);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);

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

        initialized = true;
    }

    // Может быть только один минтер
    function changeMinter(address minter) external {
        address cm = currentMinter;
        if (cm != address(0)) {
            revokeRole(MINTER_ROLE, cm);
        }
        grantRole(MINTER_ROLE, minter);
        currentMinter = minter;
    }

    // Может быть только один бернер
    function changeBurner(address burner) external {
        address cb = currentBurner;
        if (cb != address(0)) {
            revokeRole(MINTER_ROLE, cb);
        }
        grantRole(BURNER_ROLE, burner);
        currentBurner = burner;
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
        if (deadline < block.timestamp) {
            revert EIP2612PermisssionExpired(deadline);
        }

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

        address signer = ecrecover(hash, v, r, s);

        if (signer != owner) {
            revert EIP2612InvalidSignature(owner, signer);
        }
        _approve(owner, spender, amount);
    }
}
