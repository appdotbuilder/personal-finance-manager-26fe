import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { 
  Transaction, 
  Category, 
  BudgetStatus, 
  FinancialReport 
} from '../../../server/src/schema';

interface FinancialDashboardProps {
  transactions: Transaction[];
  categories: Category[];
  budgetStatus: BudgetStatus[];
  financialReport: FinancialReport | null;
  onRefresh: () => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export function FinancialDashboard({
  transactions,
  categories,
  budgetStatus,
  financialReport,
  onRefresh,
  formatCurrency
}: FinancialDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate recent transactions (last 7 days)
  const recentTransactions = transactions
    .filter((t: Transaction) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t.date) >= weekAgo;
    })
    .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Calculate expense by category for current month
  const currentMonth = new Date();
  currentMonth.setDate(1);
  const monthlyExpenses = transactions
    .filter((t: Transaction) => 
      t.type === 'expense' && 
      new Date(t.date) >= currentMonth
    )
    .reduce((acc: Record<number, number>, t: Transaction) => {
      const categoryId = t.category_id || 0; // Use 0 for uncategorized
      acc[categoryId] = (acc[categoryId] || 0) + t.amount;
      return acc;
    }, {});

  const getCategoryName = (categoryId: number | null): string => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getCategoryColor = (categoryId: number | null): string => {
    if (!categoryId) return '#6b7280'; // Gray for uncategorized
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
          <p className="text-gray-600">Overview of your financial health</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Report Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Monthly Financial Summary
            </CardTitle>
            <CardDescription>
              Current month financial overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            {financialReport ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700 font-medium">Total Income</span>
                  <span className="text-green-800 font-bold">
                    {formatCurrency(financialReport.total_income)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700 font-medium">Total Expenses</span>
                  <span className="text-red-800 font-bold">
                    {formatCurrency(financialReport.total_expenses)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700 font-medium">Net Income</span>
                  <div className="flex items-center gap-2">
                    {financialReport.net_income >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`font-bold ${
                      financialReport.net_income >= 0 ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {formatCurrency(financialReport.net_income)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No financial data available</p>
                <p className="text-sm">Start by adding some transactions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Budget Status
            </CardTitle>
            <CardDescription>
              Current budget performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgetStatus.length > 0 ? (
              <div className="space-y-4">
                {budgetStatus.slice(0, 3).map((budget: BudgetStatus) => (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{budget.category_name}</span>
                      <Badge variant={budget.is_over_budget ? 'destructive' : 'secondary'}>
                        {budget.percentage_used.toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress 
                      value={Math.min(budget.percentage_used, 100)}
                      className="h-2"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{formatCurrency(budget.spent_amount)} spent</span>
                      <span>{formatCurrency(budget.budget_amount)} budget</span>
                    </div>
                  </div>
                ))}
                {budgetStatus.length > 3 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    +{budgetStatus.length - 3} more budgets
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No budgets set up yet</p>
                <p className="text-sm">Create budgets to track your spending</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Last 5 transactions from the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction: Transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(transaction.category_id) }}
                      />
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-600">
                          {getCategoryName(transaction.category_id)} • {
                            new Date(transaction.date).toLocaleDateString()
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className="text-xs">
                        {transaction.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent transactions</p>
                <p className="text-sm">Your recent activity will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Monthly Expenses by Category
            </CardTitle>
            <CardDescription>
              Breakdown of current month expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(monthlyExpenses).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(monthlyExpenses)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([categoryId, amount]) => {
                    const numCategoryId = parseInt(categoryId);
                    const categoryName = getCategoryName(numCategoryId || null);
                    const categoryColor = getCategoryColor(numCategoryId || null);
                    const totalExpenses = Object.values(monthlyExpenses).reduce((sum: number, amt: number) => sum + amt, 0);
                    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                    
                    return (
                      <div key={categoryId} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: categoryColor }}
                            />
                            <span className="font-medium">{categoryName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-red-600">
                              {formatCurrency(amount)}
                            </span>
                            <div className="text-xs text-gray-500">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-1" />
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No expenses this month</p>
                <p className="text-sm">Expense breakdown will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}