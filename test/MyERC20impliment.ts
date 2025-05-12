import { expect } from "chai";
import { ethers, network  } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import dotenv from "dotenv";

dotenv.config();
const initializer = new ethers.Wallet(`0x${process.env.PRIVATE_KEY}`, ethers.provider);
describe("КОНТРАКТ С РОЛЕВОЙ МОДЕЛЬЮ И PERMIT", function () {
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
        await network.provider.send("hardhat_setBalance", [
            initializer.address,
            ethers.toQuantity(ethers.parseEther("1000"))
        ]);
        // Деплоим контракт
        MyERC20 = await ethers.getContractFactory("MyERC20impliment", initializer);
        myERC20 = await MyERC20.deploy();
        await myERC20.waitForDeployment();
        await myERC20.initialize();
    });

    describe("ДЕПЛОЙ", function () {
        it("Тот кто деплоит контракт должен быть админом", async function () {
            expect(
                await myERC20.hasRole(await myERC20.ADMIN_ROLE(), initializer.address)
            ).to.equal(true);
        });

        it("На деплоера должно быть сминчено 1000000 токенов", async function () {
            const ownerBalance = await myERC20.balanceOf(initializer.address);
            expect(await myERC20.totalSupply()).to.equal(ownerBalance);
            expect(ownerBalance).to.equal(INITIAL_SUPPLY);
        });

        it("Должны быть установлены корректные имя и символ", async function () {
            expect(await myERC20.name()).to.equal(NAME);
            expect(await myERC20.symbol()).to.equal(SYMBOL);
        });

        it("Должна буть установлена корректная разрадность", async function () {
            expect(await myERC20.decimals()).to.equal(18);
        });
    });

    describe("РОЛИ", function () {
        it("Админ может назначать минтера", async function () {
            await myERC20.changeMinter(addr1.address);
            expect(
                await myERC20.hasRole(
                    await myERC20.MINTER_ROLE(),
                    addr1.address
                )
            ).to.equal(true);
        });

        it("Админ может назначать бернера", async function () {
            await myERC20.changeBurner(addr1.address);
            expect(
                await myERC20.hasRole(
                    await myERC20.BURNER_ROLE(),
                    addr1.address
                )
            ).to.equal(true);
        });

        it("Не админ не может назначать роли", async function () {
            await expect(myERC20.connect(addr1).changeMinter(addr2.address)).to
                .be.reverted;
            await expect(myERC20.connect(addr1).changeBurner(addr2.address)).to
                .be.reverted;
        });
    });

    describe("МИНТИНГ", function () {
        it("Минтинг должен осуществляться с адреса минтера", async function () {
            await myERC20.changeMinter(addr1.address);
            await myERC20.connect(addr1).mint(addr2.address, MINT_AMOUNT);
            expect(await myERC20.balanceOf(addr2.address)).to.equal(
                MINT_AMOUNT
            );
        });

        it("Не минтер не может осуществлять минтинг", async function () {
            await expect(myERC20.mint(addr2.address, MINT_AMOUNT)).to.be
                .reverted;
            await expect(
                myERC20.connect(addr2).mint(addr2.address, MINT_AMOUNT)
            ).to.be.reverted;
        });
    });

    describe("БЕРНИНГ", function () {
        it("Бернинг должен осуществляться с адреса бернера", async function () {
            await myERC20.changeBurner(addr1.address);
            await myERC20.connect(addr1).burn(initializer.address, BURN_AMOUNT);
            expect(await myERC20.balanceOf(initializer.address)).to.equal(
                INITIAL_SUPPLY - BURN_AMOUNT
            );
        });

        it("Не бернер не может осуществлять бернинг", async function () {
            await expect(myERC20.burn(owner.address, BURN_AMOUNT)).to.be
                .reverted;
            await expect(
                myERC20.connect(addr2).burn(owner.address, BURN_AMOUNT)
            ).to.be.reverted;
        });

        it("Бернер не может сжечь больше баланса чем есть>", async function () {
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

    describe("PERMIT", function () {
        const amount = ethers.parseEther("100");
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        it("Можно аппрувить через permit с учетом стандарта", async function () {
            const ownerAddress = owner.address;
            const spender = addr1.address;

            const nonce = await myERC20.nonces(ownerAddress);
            const chainId = Number(
                (await ethers.provider.getNetwork()).chainId
            );
            // Готовим данные для подписи
            const domain = {
                name: NAME,
                version: "1",
                chainId: chainId,
                verifyingContract: myERC20.target,
            };
            // Готовим типы данных для подписи
            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };
            // Готовим сообщение для подписи
            const message = {
                owner: ownerAddress,
                spender: spender,
                value: amount,
                nonce: nonce,
                deadline: deadline,
            };
            // Подписываем данные в соответствии со стандартом EIP-712
            const signature = await owner.signTypedData(domain, types, message);
            // Извлекаем v, r, s из подписи
            const { v, r, s } = ethers.Signature.from(signature);
            // Вызываем функцию permit в контракте
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

        it("Permit должен выбросить ошибку, если подпись не подходит", async function () {
            // Все делаеми как в предыдущем тесте, только с другим адресом
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

        it("Permit должен выбросить ошибку если время вышло", async function () {
            // Все делаеми как в предыдущем тесте, только с другим адресом
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
