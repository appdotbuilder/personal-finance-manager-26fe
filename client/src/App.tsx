import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  Transaction, 
  Category, 
  Budget, 
  FinancialReport, 
  BudgetStatus,
  TransactionFilter 
} from '../../server/src/schema';

// Import feature components
import { TransactionManager } from '@/components/TransactionManager';
import { CategoryManager } from '@/components/CategoryManager';
import { BudgetManager } from '@/components/BudgetManager';
import { FinancialDashboard } from '@/components/FinancialDashboard';

function App() {
  // State management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([]);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data loading functions
  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadTransactions = useCallback(async (filter?: TransactionFilter) => {
    try {
      const result = await trpc.getTransactions.query(filter);
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, []);

  const loadBudgets = useCallback(async () => {
    try {
      const result = await trpc.getBudgets.query();
      setBudgets(result);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  }, []);

  const loadBudgetStatus = useCallback(async () => {
    try {
      const result = await trpc.getBudgetStatus.query();
      setBudgetStatus(result);
    } catch (error) {
      console.error('Failed to load budget status:', error);
    }
  }, []);

  const loadFinancialReport = useCallback(async () => {
    try {
      const result = await trpc.getFinancialReport.query({
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end_date: new Date()
      });
      setFinancialReport(result);
    } catch (error) {
      console.error('Failed to load financial report:', error);
    }
  }, []);

  // Load all data on mount
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadCategories(),
        loadTransactions(),
        loadBudgets(),
        loadBudgetStatus(),
        loadFinancialReport()
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [loadCategories, loadTransactions, loadBudgets, loadBudgetStatus, loadFinancialReport]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Utility function to format currency
  const formatCurrency = (amountInCents: number): string => {
    return (amountInCents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  // Quick stats calculation
  const quickStats = {
    totalIncome: transactions
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
    totalExpenses: transactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
    transactionCount: transactions.length,
    categoryCount: categories.length
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            💰 Personal Finance Manager
          </h1>
          <p className="text-gray-600">Take control of your financial future</p>
          
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Income</p>
                    <p className="text-2xl font-bold">{formatCurrency(quickStats.totalIncome)}</p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">Total Expenses</p>
                    <p className="text-2xl font-bold">{formatCurrency(quickStats.totalExpenses)}</p>
                  </div>
                  <div className="text-3xl">📉</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Net Income</p>
                    <p className="text-2xl font-bold">{formatCurrency(quickStats.totalIncome - quickStats.totalExpenses)}</p>
                  </div>
                  <div className="text-3xl">💵</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Transactions</p>
                    <p className="text-2xl font-bold">{quickStats.transactionCount}</p>
                  </div>
                  <div className="text-3xl">📋</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="bg-white/90 rounded-t-lg">
                <TabsList className="grid w-full grid-cols-4 bg-gray-50 rounded-none rounded-t-lg border-b">
                  <TabsTrigger value="dashboard" className="flex items-center gap-2">
                    <span>📊</span> Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="flex items-center gap-2">
                    <span>💸</span> Transactions
                  </TabsTrigger>
                  <TabsTrigger value="budgets" className="flex items-center gap-2">
                    <span>🎯</span> Budgets
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex items-center gap-2">
                    <span>🏷️</span> Categories
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="dashboard" className="mt-0">
                  <FinancialDashboard
                    transactions={transactions}
                    categories={categories}
                    budgetStatus={budgetStatus}
                    financialReport={financialReport}
                    onRefresh={loadAllData}
                    formatCurrency={formatCurrency}
                  />
                </TabsContent>

                <TabsContent value="transactions" className="mt-0">
                  <TransactionManager
                    transactions={transactions}
                    categories={categories}
                    onTransactionCreated={loadTransactions}
                    onTransactionUpdated={loadTransactions}
                    onTransactionDeleted={loadTransactions}
                    onFilterChange={loadTransactions}
                    formatCurrency={formatCurrency}
                  />
                </TabsContent>

                <TabsContent value="budgets" className="mt-0">
                  <BudgetManager
                    budgets={budgets}
                    categories={categories}
                    budgetStatus={budgetStatus}
                    onBudgetCreated={loadBudgets}
                    onBudgetUpdated={loadBudgets}
                    onBudgetDeleted={loadBudgets}
                    onBudgetStatusRefresh={loadBudgetStatus}
                    formatCurrency={formatCurrency}
                  />
                </TabsContent>

                <TabsContent value="categories" className="mt-0">
                  <CategoryManager
                    categories={categories}
                    onCategoryCreated={loadCategories}
                    onCategoryUpdated={loadCategories}
                    onCategoryDeleted={loadCategories}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;