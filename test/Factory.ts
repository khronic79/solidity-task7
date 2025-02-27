import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";

describe("ФАБРИКА КОНТРАКТОВ", function () {
    let factory: any;
    let owner: Signer;
    let addr1: Signer;

    beforeEach(async function () {
        // Получаем аккаунты
        [owner, addr1] = await ethers.getSigners();

        // Деплоим контракт Factory
        const Factory = await ethers.getContractFactory("Factory");
        factory = await Factory.deploy();
        await factory.waitForDeployment();
    });

    it("Может создать контакт сохранять его адрес", async function () {
        const contractName = "TestContract";

        // Создаем новый контракт через фабрику
        await factory.createContract(contractName);

        // Получаем список развернутых контрактов
        const deployedContracts = await factory.getDeployedContracts();

        // Проверяем, что список содержит один контракт
        expect(deployedContracts.length).to.equal(1);

        // Получаем экземпляр созданного контракта
        const contractForFactory = await ethers.getContractAt(
            "ContractForFactory",
            deployedContracts[0]
        );

        // Проверяем, что имя контракта корректно
        expect(await contractForFactory.name()).to.equal(contractName);

        // Проверяем, что создатель контракта - это владелец фабрики
        expect(await contractForFactory.creator()).to.equal(
            await owner.getAddress()
        );
    });

    it("Может создать несколько контрактов", async function () {
        const contractName1 = "TestContract1";
        const contractName2 = "TestContract2";

        // Создаем два контракта через фабрику
        await factory.createContract(contractName1);
        await factory.createContract(contractName2);

        // Получаем список развернутых контрактов
        const deployedContracts = await factory.getDeployedContracts();

        // Проверяем, что список содержит два контракта
        expect(deployedContracts.length).to.equal(2);

        // Проверяем, что имена контрактов корректны
        const contract1 = await ethers.getContractAt(
            "ContractForFactory",
            deployedContracts[0]
        );
        const contract2 = await ethers.getContractAt(
            "ContractForFactory",
            deployedContracts[1]
        );

        expect(await contract1.name()).to.equal(contractName1);
        expect(await contract2.name()).to.equal(contractName2);
    });
});
