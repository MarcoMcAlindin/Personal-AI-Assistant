import { useState } from "react";
import { useOutletContext } from "react-router";
import { Menu, Sparkles, TrendingUp, TrendingDown, DollarSign, CreditCard, Building2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";

export function MoneyView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);

  // Connected accounts
  const connectedAccounts = [
    { id: 1, name: "Chase Checking", type: "Checking", balance: 12450.32, logo: "💳" },
    { id: 2, name: "Chase Savings", type: "Savings", balance: 28900.00, logo: "💰" },
    { id: 3, name: "Amex Platinum", type: "Credit Card", balance: -2340.50, logo: "💎" },
  ];

  // Recent transactions
  const transactions = [
    { id: 1, date: "Mar 21, 2026", merchant: "Whole Foods", category: "Groceries", amount: -142.38, account: "Amex Platinum" },
    { id: 2, date: "Mar 21, 2026", merchant: "Shell Gas Station", category: "Transportation", amount: -65.00, account: "Chase Checking" },
    { id: 3, date: "Mar 20, 2026", merchant: "Netflix", category: "Entertainment", amount: -15.99, account: "Chase Checking" },
    { id: 4, date: "Mar 20, 2026", merchant: "Salary Deposit", category: "Income", amount: 5200.00, account: "Chase Checking" },
    { id: 5, date: "Mar 19, 2026", merchant: "Amazon", category: "Shopping", amount: -89.99, account: "Amex Platinum" },
    { id: 6, date: "Mar 19, 2026", merchant: "Starbucks", category: "Food & Drink", amount: -8.45, account: "Chase Checking" },
    { id: 7, date: "Mar 18, 2026", merchant: "Uber", category: "Transportation", amount: -24.50, account: "Amex Platinum" },
    { id: 8, date: "Mar 18, 2026", merchant: "Target", category: "Shopping", amount: -156.22, account: "Chase Checking" },
  ];

  const totalBalance = connectedAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const monthlyIncome = 5200.00;
  const monthlyExpenses = 3842.15;
  const monthlySavings = monthlyIncome - monthlyExpenses;

  return (
    <div className={`${isMobile ? 'pt-16 pb-8' : 'pl-64'} min-h-screen`}>
      {!isMobile && <Sidebar />}
      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Money Hub
              </h1>
            </div>

            {isMobile && (
              <button
                onClick={() => setMenuOpen(true)}
                className="p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors border border-[#00FFFF]/20"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
          </div>
        </header>

        <div className="space-y-6 max-w-6xl">
          {/* AI Financial Analysis */}
          <GlassCard className="!p-8 border-[#00FFFF]/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#00FFFF]/10">
                <Sparkles className="w-6 h-6 text-[#00FFFF]" />
              </div>
              <h2 className="text-2xl font-semibold text-white">AI Financial Insights</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-[#0A0A0A]/50 rounded-lg p-4 border border-[#00FFFF]/10">
                <h3 className="text-white font-semibold mb-2">This Month's Overview</h3>
                <p className="text-[#BBC9CD] text-sm leading-relaxed">
                  Your finances are looking healthy! You're on track to save ${monthlySavings.toLocaleString()} this month. Total net worth across all accounts is ${totalBalance.toLocaleString()}. Spending is down 12% compared to last month.
                </p>
              </div>

              <div className="bg-[#0A0A0A]/50 rounded-lg p-4 border border-[#00FFFF]/10">
                <h3 className="text-white font-semibold mb-2">AI Recommendations</h3>
                <ul className="space-y-2 text-[#BBC9CD] text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-[#00FFFF] mt-1">•</span>
                    <span>Your grocery spending is 15% higher than average - consider meal planning to reduce costs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00FFFF] mt-1">•</span>
                    <span>You have ${connectedAccounts[1].balance.toLocaleString()} in savings - consider investing some in a high-yield account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00FFFF] mt-1">•</span>
                    <span>Pay off your credit card balance of $2,340.50 to avoid interest charges</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00FFFF] mt-1">•</span>
                    <span>You're spending $89/month on subscriptions - review and cancel unused services</span>
                  </li>
                </ul>
              </div>
            </div>
          </GlassCard>

          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="!p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-[#00FFFF]/10">
                  <DollarSign className="w-5 h-5 text-[#00FFFF]" />
                </div>
                <h3 className="text-white font-semibold">Total Balance</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-[#BBC9CD]">Across all accounts</div>
            </GlassCard>

            <GlassCard className="!p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-white font-semibold">Income</h3>
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">
                ${monthlyIncome.toLocaleString()}
              </div>
              <div className="text-sm text-[#BBC9CD]">This month</div>
            </GlassCard>

            <GlassCard className="!p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-white font-semibold">Expenses</h3>
              </div>
              <div className="text-3xl font-bold text-red-400 mb-1">
                ${monthlyExpenses.toLocaleString()}
              </div>
              <div className="text-sm text-[#BBC9CD]">This month</div>
            </GlassCard>
          </div>

          {/* Connected Accounts */}
          <GlassCard className="!p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Connected Accounts</h2>
              <button className="px-4 py-2 rounded-lg bg-[#00FFFF]/10 hover:bg-[#00FFFF]/20 text-[#00FFFF] border border-[#00FFFF]/30 transition-colors text-sm font-semibold">
                + Add Account
              </button>
            </div>

            <div className="space-y-3">
              {connectedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#0A0A0A]/50 border border-[#00FFFF]/10 hover:border-[#00FFFF]/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-2xl">
                      {account.logo}
                    </div>
                    <div>
                      <div className="text-white font-semibold">{account.name}</div>
                      <div className="text-sm text-[#BBC9CD]">{account.type}</div>
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${account.balance < 0 ? 'text-red-400' : 'text-white'}`}>
                    ${Math.abs(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Spending by Category */}
          <GlassCard className="!p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Spending by Category</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#BBC9CD] text-base">Groceries</span>
                  <span className="text-white font-semibold text-base">$842.38</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FFFF] rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#BBC9CD] text-base">Transportation</span>
                  <span className="text-white font-semibold text-base">$524.50</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FFFF] rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#BBC9CD] text-base">Shopping</span>
                  <span className="text-white font-semibold text-base">$456.21</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FFFF] rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#BBC9CD] text-base">Food & Drink</span>
                  <span className="text-white font-semibold text-base">$328.45</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FFFF] rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#BBC9CD] text-base">Entertainment</span>
                  <span className="text-white font-semibold text-base">$215.99</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00FFFF] rounded-full" style={{ width: '17%' }}></div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Recent Transactions */}
          <GlassCard className="!p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Recent Transactions</h2>
            
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#0A0A0A]/30 hover:bg-[#0A0A0A]/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${transaction.amount > 0 ? 'bg-green-500/10' : 'bg-[#1A1A1A]'}`}>
                      {transaction.amount > 0 ? (
                        <ArrowDownRight className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-[#BBC9CD]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{transaction.merchant}</div>
                      <div className="text-sm text-[#BBC9CD]">
                        {transaction.category} • {transaction.account}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${transaction.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount < 0 ? '-' : ''}$
                        {Math.abs(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-[#BBC9CD]">{transaction.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-3 rounded-lg bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] border border-[#00FFFF]/20 transition-colors font-semibold">
              View All Transactions
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
