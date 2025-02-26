import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MyERC20", function () {
    let MyERC20: any;
    let myERC20: any;
    let owner: HardhatEthersSigner;
    let addr1: HardhatEthersSigner;
    let addr2: HardhatEthersSigner;
    let addrs: HardhatEthersSigner[];

    const NAME = "My test token";
    const SYMBOL = "MTT";
    const INITIAL_SUPPLY: bigint = ethers.parseEther("1000000");
    const MINT_AMOUNT: bigint = ethers.parseEther("1000");
    const BURN_AMOUNT: bigint = ethers.parseEther("500");

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        MyERC20 = await ethers.getContractFactory("MyERC20");
        myERC20 = await MyERC20.deploy();
        await myERC20.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(
                await myERC20.hasRole(await myERC20.ADMIN_ROLE(), owner.address)
            ).to.equal(true);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await myERC20.balanceOf(owner.address);
            expect(await myERC20.totalSupply()).to.equal(ownerBalance);
            expect(ownerBalance).to.equal(INITIAL_SUPPLY);
        });

        it("Should have correct name and symbol", async function () {
            expect(await myERC20.name()).to.equal(NAME);
            expect(await myERC20.symbol()).to.equal(SYMBOL);
        });

        it("Should have correct decimals", async function () {
            expect(await myERC20.decimals()).to.equal(18);
        });
    });

    describe("Roles", function () {
        it("Should allow admin to change minter", async function () {
            await myERC20.changeMinter(addr1.address);
            expect(
                await myERC20.hasRole(
                    await myERC20.MINTER_ROLE(),
                    addr1.address
                )
            ).to.equal(true);
        });

        it("Should allow admin to change burner", async function () {
            await myERC20.changeBurner(addr1.address);
            expect(
                await myERC20.hasRole(
                    await myERC20.BURNER_ROLE(),
                    addr1.address
                )
            ).to.equal(true);
        });

        it("Should not allow non-admin to change roles", async function () {
            await expect(myERC20.connect(addr1).changeMinter(addr2.address)).to
                .be.reverted;
            await expect(myERC20.connect(addr1).changeBurner(addr2.address)).to
                .be.reverted;
        });
    });

    describe("Minting", function () {
        it("Should allow minter to mint tokens", async function () {
            await myERC20.changeMinter(addr1.address);
            await myERC20.connect(addr1).mint(addr2.address, MINT_AMOUNT);
            expect(await myERC20.balanceOf(addr2.address)).to.equal(
                MINT_AMOUNT
            );
        });

        it("Should not allow non-minter to mint tokens", async function () {
            await expect(myERC20.mint(addr2.address, MINT_AMOUNT)).to.be
                .reverted;
            await expect(
                myERC20.connect(addr2).mint(addr2.address, MINT_AMOUNT)
            ).to.be.reverted;
        });
    });

    describe("Burning", function () {
        it("Should allow burner to burn tokens", async function () {
            await myERC20.changeBurner(addr1.address);
            await myERC20.connect(addr1).burn(owner.address, BURN_AMOUNT);
            expect(await myERC20.balanceOf(owner.address)).to.equal(
                INITIAL_SUPPLY - BURN_AMOUNT
            );
        });

        it("Should not allow non-burner to burn tokens", async function () {
            await expect(myERC20.burn(owner.address, BURN_AMOUNT)).to.be
                .reverted;
            await expect(
                myERC20.connect(addr2).burn(owner.address, BURN_AMOUNT)
            ).to.be.reverted;
        });

        it("Should revert if burner tries to burn more than the balance", async function () {
            await myERC20.changeBurner(addr1.address);
            await expect(
                myERC20
                    .connect(addr1)
                    .burn(
                        owner.address,
                        INITIAL_SUPPLY + ethers.parseEther("1")
                    )
            ).to.be.reverted;
        });
    });

    describe("Permit", function () {
        const amount = ethers.parseEther("100");
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        it("Should allow permit and approve", async function () {
            const ownerAddress = owner.address;
            const spender = addr1.address;

            const nonce = await myERC20.nonces(ownerAddress);
            const chainId = Number(
                (await ethers.provider.getNetwork()).chainId
            );

            const domain = {
                name: NAME,
                version: "1",
                chainId: chainId,
                verifyingContract: myERC20.target,
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };

            const message = {
                owner: ownerAddress,
                spender: spender,
                value: amount,
                nonce: nonce,
                deadline: deadline,
            };

            const signature = await owner.signTypedData(domain, types, message);

            const { v, r, s } = ethers.Signature.from(signature);

            await myERC20.permit(
                ownerAddress,
                spender,
                amount,
                deadline,
                v,
                r,
                s
            );

            expect(await myERC20.allowance(ownerAddress, spender)).to.equal(
                amount
            );
        });

        it("Should revert with invalid signature", async function () {
            const ownerAddress = owner.address;
            const spender = addr1.address;
            const incorrectOwnerAddress = addr2.address;

            const nonce = await myERC20.nonces(ownerAddress);
            const chainId = Number(
                (await ethers.provider.getNetwork()).chainId
            );

            const domain = {
                name: NAME,
                version: "1",
                chainId: chainId,
                verifyingContract: myERC20.target,
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };

            const message = {
                owner: ownerAddress,
                spender: spender,
                value: amount,
                nonce: nonce,
                deadline: deadline,
            };

            const signature = await owner.signTypedData(domain, types, message);

            const { v, r, s } = ethers.Signature.from(signature);

            await expect(
                myERC20.permit(
                    incorrectOwnerAddress,
                    spender,
                    amount,
                    deadline,
                    v,
                    r,
                    s
                )
            ).to.be.revertedWithCustomError(myERC20, "EIP2612InvalidSignature");
        });

        it("Should revert if permit expired", async function () {
            const ownerAddress = owner.address;
            const spender = addr1.address;

            const nonce = await myERC20.nonces(ownerAddress);
            const chainId = Number(
                (await ethers.provider.getNetwork()).chainId
            );

            const domain = {
                name: NAME,
                version: "1",
                chainId: chainId,
                verifyingContract: myERC20.target,
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };

            const message = {
                owner: ownerAddress,
                spender: spender,
                value: amount,
                nonce: nonce,
                deadline: Math.floor(Date.now() / 1000) - 3600,
            };

            const signature = await owner.signTypedData(domain, types, message);

            const { v, r, s } = ethers.Signature.from(signature);

            await expect(
                myERC20.permit(
                    ownerAddress,
                    spender,
                    amount,
                    Math.floor(Date.now() / 1000) - 3600,
                    v,
                    r,
                    s
                )
            ).to.be.revertedWithCustomError(
                myERC20,
                "EIP2612PermisssionExpired"
            );
        });
    });
});
