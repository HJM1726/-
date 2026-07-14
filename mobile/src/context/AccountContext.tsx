import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getJSON, setJSON, KEYS } from "../lib/storage";

/* 간이 계정(참고앱 방식의 로그인 게이트).
 * 閲覧・投稿は匿名のまま、ポイントの受け取り・使用にはニックネーム登録を要求する。
 * MVPでは端末ローカル登録。サーバー連동 후에는 LINE/Apple 로그인으로 교체하고
 * Supabase 익명 세션을 본계정으로 승격(linkIdentity)하는 흐름으로 확장한다. */

export interface Account {
  nickname: string;
  createdAt: number;
}

interface AccountValue {
  account: Account | null;
  loaded: boolean;
  login: (nickname: string) => Promise<void>;
}

const AccountContext = createContext<AccountValue>({
  account: null,
  loaded: false,
  login: async () => {},
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getJSON<Account | null>(KEYS.account, null).then((a) => {
      setAccount(a);
      setLoaded(true);
    });
  }, []);

  const login = useCallback(async (nickname: string) => {
    const next: Account = { nickname: nickname.trim(), createdAt: Date.now() };
    setAccount(next);
    await setJSON(KEYS.account, next);
  }, []);

  return (
    <AccountContext.Provider value={{ account, loaded, login }}>{children}</AccountContext.Provider>
  );
}

export function useAccount(): AccountValue {
  return useContext(AccountContext);
}
