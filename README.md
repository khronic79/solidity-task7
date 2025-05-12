# Задание 7. Проект по 7 модулю
## Цель:
1. Научиться осуществлять безопасность смарт-контрактов

## Описание/Пошаговая инструкция выполнения домашнего задания:
1. Возьмите один из своих предыдущих контрактов и выполните его самостоятельный аудит, попытайтесь найти и исправить ошибки, которые могут быть использованы для атак. Особое внимание уделите векторам атак, таким как reentrancy и тд. Также в дополнение проанализируйте и зафиксируйте в аудите возможность оптимизации газа.
2. Используйте анализаторы кода для Solidity, чтобы провести автоматическую проверку контракта на наличие проблем и нарушений best practices.
3. Учтите в своем контракте возможность его обновления и убедитесь, что обновление не приведет к critical issues.
4. Подготовьтесь к дополнительным вопросам на собеседовании по Solidity и разработке на блокчейнах.

## Что сделано
1. Для примера взяты контракты из [задания 4](https://github.com/khronic79/solidity-task4):
    - [MyERC20impliment.sol](MyERC20impliment.sol) и [тест](https://github.com/khronic79/solidity-task4/blob/main/test/MyERC20.ts) к этому контракту.
    - [Proxy.sol](https://github.com/khronic79/solidity-task4/blob/main/contracts/Proxy.sol) и [тест](https://github.com/khronic79/solidity-task4/blob/main/test/Proxy.ts) к этому контракту.
    
    Это имплементация контракта токена ERC20 и прокси, который использует ее.
2. Выполнен [аудит](./АУДИТ.pdf) эти контрактов.
3. В соответствии с аудитом внесены изменения в контракты:
    - [MyERC20impliment.sol](./contracts/MyERC20impliment.sol).
    - [Proxy.sol](./contracts/MyProxy.sol) (ранее назывался Proxy.sol).

    Измения описаны в коде контракта комментариями.

4. В проект добавлен Solhint.


## Как запустить тест на локальной машине
Для запуска необходимо, чтобы на локальной машине было установлен программное обеспечение Node js.
1. Необходимо склонировать репозиторий:
```shell
git clone https://github.com/khronic79/solidity-task4.git
```
или
```shell
git clone git@github.com:khronic79/solidity-task4.git
```
2. Установить зависимости для Node js, например:
```shell
npm init
```
3. Запустить тест:
```shell
npx hardhat test
```
ВАЖНО!!! В контракте имплементации указан адрес, с которого должна осуществляться инициализация стора. Для правильной работы тестов необходимо:
1. Указать свой адреса в коде контракта [MyERC20impliment.sol](./contracts/MyERC20impliment.sol):
```solidity
contract MyERC20impliment is ERC20Upgradeable, AccessControlUpgradeable {
    error EIP2612PermisssionExpired(uint256 deadline);
    error EIP2612InvalidSignature(address owner, address signer);
    error InitializeOnlyByInitializer();
    event ChangeMinter(address oldMinter, address newMinter);
    event ChangeBurner(address oldBurner, address newBurner);
    // Для данной константы!!!
    address public constant INITIALIZER_ADDRESS = 0x5c8630069c6663e7Fa3eAAAB562e2fF4419e12f7;// Изменить адрес
```
2. Создать файл .env и записать в него приватный ключ для ранее добавленного адреса в следующей форме
```bash
PRIVATE_KEY=ВАШ_ПРИВАТНЫЙ_КЛЮЧ
```