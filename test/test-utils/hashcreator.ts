import { ethers } from "hardhat";

export function generatePermitHash(
  owner: string,
  spender: string,
  amount: bigint,
  nonce: bigint,
  deadline: number,
  DOMAIN_SEPARATOR: string
) {
  const PERMIT_TYPE_HASH = ethers.keccak256(
    ethers.toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
  );
  
  const structHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      [ 'bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256' ],
      [ PERMIT_TYPE_HASH, owner, spender, amount, nonce, deadline ]
    )
  );

  const hash = ethers.keccak256(
    ethers.concat([
      ethers.getBytes("0x1901"),
      ethers.getBytes(DOMAIN_SEPARATOR),
      ethers.getBytes(structHash)
    ])
  );

  return hash;
}

export function generateDomainSeparator(
  name: string,
  version: string,
  chainId: number,
  verifyingContract: string
) {
  const domainTypeHash = ethers.keccak256(
    ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
  );

  const domainSeparator = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        domainTypeHash,
        ethers.keccak256(ethers.toUtf8Bytes(name)),
        ethers.keccak256(ethers.toUtf8Bytes(version)),
        chainId,
        verifyingContract,
      ]
    )
  );
  return domainSeparator;
}