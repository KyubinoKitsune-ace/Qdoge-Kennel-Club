import React, { createContext, useContext, useState } from "react";
import { QubicHelper } from "@qubic-lib/qubic-ts-library/dist/qubicHelper";
import Crypto, { SIGNATURE_LENGTH } from "@qubic-lib/qubic-ts-library/dist/crypto";
import { MetamaskActions, MetaMaskContext, MetaMaskProvider } from "./MetamaskContext";
import { connectTypes, defaultSnapOrigin } from "./config";
import { useWalletConnect } from "./WalletConnectContext";
import { QubicTransaction } from "@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction";
import { base64ToUint8Array, decodeUint8ArrayTx, uint8ArrayToBase64 } from "@/utils";
import { DEFAULT_TX_SIZE } from "@/constants";
import { toast } from "react-hot-toast";
import { getSnap } from "./utils/snap";
import { connectSnap } from "./utils/snap";
// @ts-expect-error Package ships without compatible type declarations.
import { QubicVault } from "@qubic-lib/qubic-ts-vault-library";
import { useAtom } from "jotai";
import { balancesAtom } from "@/store/balances";
import { registerUser } from "@/services/backend.service";

interface Wallet {
  connectType: string;
  publicKey: string;
  alias?: string;
  privateKey?: string;
}

interface QubicConnectContextType {
  connected: boolean;
  wallet: Wallet | null;
  showConnectModal: boolean;
  connect: (wallet: Wallet) => void;
  disconnect: () => void;
  toggleConnectModal: () => void;
  getMetaMaskPublicId: (accountIdx?: number, confirm?: boolean) => Promise<string>;
  getSignedTx: (tx: Uint8Array | QubicTransaction) => Promise<{ tx: Uint8Array }>;
  mmSnapConnect: () => Promise<void>;
  privateKeyConnect: (privateSeed: string) => Promise<void>;
  vaultFileConnect: (selectedFile: File, password: string) => Promise<QubicVault>;
}

const QubicConnectContext = createContext<QubicConnectContextType | undefined>(undefined);

interface QubicConnectProviderProps {
  children: React.ReactNode;
}

export function QubicConnectProvider({ children }: QubicConnectProviderProps) {
  const [connected, setConnected] = useState<boolean>(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const { signTransaction } = useWalletConnect();
  const [state, dispatch] = useContext(MetaMaskContext);
  const [, setBalances] = useAtom(balancesAtom);

  const qHelper = new QubicHelper();

  const connect = (wallet: Wallet): void => {
    localStorage.setItem("wallet", JSON.stringify(wallet));
    setWallet(wallet);
    setConnected(true);
    
    // Register user in backend
    registerUser(wallet.publicKey).catch((err) => {
      console.error("Failed to register user:", err);
    });
  };

  const disconnect = (): void => {
    localStorage.removeItem("wallet");
    setWallet(null);
    setConnected(false);
    setBalances([]);
  };

  const toggleConnectModal = (): void => {
    setShowConnectModal(!showConnectModal);
  };

  const getMetaMaskPublicId = async (accountIdx: number = 0, confirm: boolean = false): Promise<string> => {
    return await window.ethereum.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: defaultSnapOrigin,
        request: {
          method: "getPublicId",
          params: {
            accountIdx,
            confirm,
          },
        },
      },
    });
  };

  const getMetaMaskSignedTx = async (tx: Uint8Array, offset: number, accountIdx: number = 0) => {
    const base64Tx = btoa(String.fromCharCode(...Array.from(tx)));

    return await window.ethereum.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: defaultSnapOrigin,
        request: {
          method: "signTransaction",
          params: {
            base64Tx,
            accountIdx,
            offset,
          },
        },
      },
    });
  };

  const getSignedTx = async (tx: Uint8Array | QubicTransaction): Promise<{ tx: Uint8Array }> => {
    if (!wallet || !connectTypes.includes(wallet.connectType)) {
      throw new Error(`Unsupported connectType: ${wallet?.connectType}`);
    }

    const processedTx = tx instanceof QubicTransaction ? await tx.build("0".repeat(55)) : tx;

    switch (wallet.connectType) {
      case "mmSnap": {
        const mmResult = await getMetaMaskSignedTx(processedTx, processedTx.length - SIGNATURE_LENGTH);
        const binaryTx = atob(mmResult.signedTx);
        const signature = new Uint8Array(binaryTx.length);
        for (let i = 0; i < binaryTx.length; i++) {
          signature[i] = binaryTx.charCodeAt(i);
        }
        processedTx.set(signature, processedTx.length - SIGNATURE_LENGTH);
        return { tx: processedTx };
      }

      case "walletconnect": {
        const decodedTx = processedTx instanceof Uint8Array ? decodeUint8ArrayTx(processedTx) : processedTx;
        const [from, to] = await Promise.all([
          qHelper.getIdentity(decodedTx.sourcePublicKey.getIdentity()),
          qHelper.getIdentity(decodedTx.destinationPublicKey.getIdentity()),
        ]);
        const payloadBase64 = uint8ArrayToBase64(decodedTx.payload.getPackageData());
        if (wallet?.connectType == "walletconnect") {
          toast("Sign the transaction in your wallet", {
            icon: "🔑",
          });
        }
        const wcResult = await signTransaction({
          from,
          to,
          amount: Number(decodedTx.amount.getNumber()),
          tick: decodedTx.tick,
          inputType: decodedTx.inputType,
          payload: payloadBase64 == "" ? null : payloadBase64,
        });
        return { tx: base64ToUint8Array(wcResult.signedTransaction) };
      }

      default: {
        if (!wallet.privateKey) throw new Error("Private key required");
        const qCrypto = await Crypto;
        const idPackage = await qHelper.createIdPackage(wallet.privateKey);
        const digest = new Uint8Array(SIGNATURE_LENGTH);
        const toSign = processedTx.slice(0, processedTx.length - SIGNATURE_LENGTH);

        qCrypto.K12(toSign, digest, SIGNATURE_LENGTH);
        const signedTx =
          tx instanceof QubicTransaction
            ? await tx.build(wallet.privateKey)
            : qCrypto.schnorrq.sign(idPackage.privateKey, idPackage.publicKey, digest);
        return { tx: signedTx || new Uint8Array(DEFAULT_TX_SIZE) };
      }
    }
  };

  const mmSnapConnect = async () => {
    try {
      await connectSnap(!state.isFlask ? "npm:@qubic-lib/qubic-mm-snap" : undefined);
      const installedSnap = await getSnap();
      // get publicId from snap
      const publicKey = await getMetaMaskPublicId(0);
      const wallet = {
        connectType: "mmSnap",
        publicKey,
      };
      connect(wallet);
      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (error) {
      console.error(error);
      dispatch({
        type: MetamaskActions.SetError,
        payload: error,
      });
    }
  };

  const privateKeyConnect = async (privateSeed: string) => {
    const idPackage = await new QubicHelper().createIdPackage(privateSeed);
    connect({
      connectType: "privateKey",
      privateKey: privateSeed,
      publicKey: idPackage.publicId,
    });
  };

  const vaultFileConnect = async (selectedFile: File, password: string): Promise<QubicVault> => {
    if (!selectedFile || !password) {
      alert("Please select a file and enter a password.");
      return;
    }
    const vault = new QubicVault();

    const fileReader = new FileReader();

    fileReader.onload = async () => {
      try {
        await vault.importAndUnlock(
          true, // selectedFileIsVaultFile: boolean,
          password,
          null, // selectedConfigFile: File | null = null,
          selectedFile, // File | null = null,
          true, // unlock: boolean = false
        );
        // now we switch view to select one of the seeds
        return vault;
      } catch (error) {
        console.error("Error unlocking vault:", error);
        alert("Failed to unlock the vault. Please check your password and try again.");
      }
    };

    fileReader.onerror = (error) => {
      console.error("Error reading file:", error);
      alert("Failed to read the file. Please try again.");
    };

    fileReader.readAsArrayBuffer(selectedFile);
  };

  const contextValue: QubicConnectContextType = {
    connected,
    wallet,
    showConnectModal,
    connect,
    disconnect,
    toggleConnectModal,
    getMetaMaskPublicId,
    getSignedTx,
    mmSnapConnect,
    privateKeyConnect,
    vaultFileConnect,
  };

  return (
    <MetaMaskProvider>
      <QubicConnectContext.Provider value={contextValue}>{children}</QubicConnectContext.Provider>
    </MetaMaskProvider>
  );
}

export function useQubicConnect(): QubicConnectContextType {
  const context = useContext(QubicConnectContext);
  if (context === undefined) {
    throw new Error("useQubicConnect() hook must be used within a <QubicConnectProvider>");
  }
  return context;
}
