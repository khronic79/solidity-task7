import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimpleMeta", function () {
    let SimpleMeta: any;
    let simpleMeta: any;
    let owner: HardhatEthersSigner;
    let spender: HardhatEthersSigner;
    let other: HardhatEthersSigner;

    beforeEach(async function () {
        // Получаем аккаунты
        [owner, spender, other] = await ethers.getSigners();

        // Деплоим контракт
        SimpleMeta = await ethers.getContractFactory("SimpleMeta");
        simpleMeta = await SimpleMeta.deploy();
        await simpleMeta.waitForDeployment();
    });

    it("Should set value with valid signature", async function () {
        const ownerAddress = owner.address;
        const spenderAddress = spender.address;
        const newValue = 42;
        const nonce = await simpleMeta.nonces(ownerAddress);

        // Определяем типы данных для EIP-712
        const domain = {
            name: "SimpleMeta",
            version: "1",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: simpleMeta.target,
        };

        const types = {
            SetValueWithSig: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
            ],
        };

        const message = {
            owner: ownerAddress,
            spender: spenderAddress,
            value: newValue,
            nonce: nonce,
        };

        // Подписываем данные
        const signature = await owner.signTypedData(domain, types, message);
        const { v, r, s } = ethers.Signature.from(signature);

        // Вызываем функцию setValueWithSig
        await simpleMeta.setValueWithSig(
            ownerAddress,
            spenderAddress,
            newValue,
            v,
            r,
            s
        );

        // Проверяем, что значение изменилось
        const value = await simpleMeta.value();
        expect(value).to.equal(newValue);
    });

    it("Should revert with invalid signature", async function () {
        const ownerAddress = owner.address;
        const spenderAddress = spender.address;
        const newValue = 42;
        const nonce = await simpleMeta.nonces(ownerAddress);
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 час в будущем

        // Определяем типы данных для EIP-712
        const domain = {
            name: "SimpleMeta",
            version: "1",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: simpleMeta.target,
        };

        const types = {
            SetValueWithSig: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
            ],
        };

        const message = {
            owner: ownerAddress,
            spender: spenderAddress,
            value: newValue,
            nonce: nonce,
        };

        // Подписываем данные от имени другого аккаунта (не owner)
        const signature = await other.signTypedData(domain, types, message);
        const { v, r, s } = ethers.Signature.from(signature);

        // Вызываем функцию setValueWithSig и ожидаем ошибку
        await expect(
            simpleMeta.setValueWithSig(
                ownerAddress,
                spenderAddress,
                newValue,
                v,
                r,
                s
            )
        ).to.be.revertedWithCustomError(simpleMeta, "InvalidSignature");
    });
});
