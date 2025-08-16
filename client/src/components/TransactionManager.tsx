import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit2, Trash2, Filter, X } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Transaction, 
  Category, 
  CreateTransactionInput, 
  UpdateTransactionInput,
  TransactionFilter 
} from '../../../server/src/schema';

interface TransactionManagerProps {
  transactions: Transaction[];
  categories: Category[];
  onTransactionCreated: () => Promise<void>;
  onTransactionUpdated: () => Promise<void>;
  onTransactionDeleted: () => Promise<void>;
  onFilterChange: (filter?: TransactionFilter) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export function TransactionManager({
  transactions,
  categories,
  onTransactionCreated,
  onTransactionUpdated,
  onTransactionDeleted,
  onFilterChange,
  formatCurrency
}: TransactionManagerProps) {
  // Form states
  const [createFormData, setCreateFormData] = useState<CreateTransactionInput>({
    amount: 0,
    description: '',
    type: 'expense',
    category_id: null,
    date: new Date()
  });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UpdateTransactionInput>>({});
  
  // UI states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<number | null>(null);
  
  // Filter states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filter, setFilter] = useState<TransactionFilter>({});

  const getCategoryName = (categoryId: number | null): string => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getCategoryColor = (categoryId: number | null): string => {
    if (!categoryId) return '#6b7280';
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  // Create transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreateLoading(true);
    try {
      // Convert dollars to cents
      const amountInCents = Math.round(createFormData.amount * 100);
      await trpc.createTransaction.mutate({
        ...createFormData,
        amount: amountInCents
      });
      await onTransactionCreated();
      setCreateFormData({
        amount: 0,
        description: '',
        type: 'expense',
        category_id: null,
        date: new Date()
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setIsCreateLoading(false);
    }
  };

  // Edit transaction
  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    
    setIsEditLoading(true);
    try {
      const updateData: UpdateTransactionInput = {
        id: editingTransaction.id,
        ...editFormData
      };
      
      // Convert amount to cents if provided
      if (editFormData.amount !== undefined) {
        updateData.amount = Math.round(editFormData.amount * 100);
      }

      await trpc.updateTransaction.mutate(updateData);
      await onTransactionUpdated();
      setEditingTransaction(null);
      setEditFormData({});
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update transaction:', error);
    } finally {
      setIsEditLoading(false);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (transactionId: number) => {
    try {
      await trpc.deleteTransaction.mutate(transactionId);
      await onTransactionDeleted();
      setDeletingTransactionId(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  // Open edit dialog
  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      amount: transaction.amount / 100, // Convert cents to dollars
      description: transaction.description,
      type: transaction.type,
      category_id: transaction.category_id,
      date: new Date(transaction.date)
    });
    setIsEditDialogOpen(true);
  };

  // Apply filters
  const applyFilters = async () => {
    await onFilterChange(Object.keys(filter).length > 0 ? filter : undefined);
    setIsFilterOpen(false);
  };

  // Clear filters
  const clearFilters = async () => {
    setFilter({});
    await onFilterChange(undefined);
    setIsFilterOpen(false);
  };

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction Management</h2>
          <p className="text-gray-600">Record and manage your income and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Dialog */}
          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {Object.keys(filter).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.keys(filter).length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Transactions</DialogTitle>
                <DialogDescription>
                  Filter transactions by type, category, or date range
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="filter-type">Transaction Type</Label>
                  <Select
                    value={filter.type || ''}
                    onValueChange={(value) => setFilter((prev: TransactionFilter) => ({
                      ...prev,
                      type: value as 'income' | 'expense' || undefined
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filter-category">Category</Label>
                  <Select
                    value={filter.category_id?.toString() || ''}
                    onValueChange={(value) => setFilter((prev: TransactionFilter) => ({
                      ...prev,
                      category_id: value ? parseInt(value) : undefined
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      <SelectItem value="0">Uncategorized</SelectItem>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="filter-start-date">Start Date</Label>
                    <Input
                      type="date"
                      value={filter.start_date ? filter.start_date.toISOString().split('T')[0] : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter((prev: TransactionFilter) => ({
                        ...prev,
                        start_date: e.target.value ? new Date(e.target.value) : undefined
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-end-date">End Date</Label>
                    <Input
                      type="date"
                      value={filter.end_date ? filter.end_date.toISOString().split('T')[0] : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter((prev: TransactionFilter) => ({
                        ...prev,
                        end_date: e.target.value ? new Date(e.target.value) : undefined
                      }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Transaction Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
                <DialogDescription>
                  Record a new income or expense transaction
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div>
                  <Label htmlFor="create-amount">Amount ($)</Label>
                  <Input
                    id="create-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={createFormData.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateTransactionInput) => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-description">Description</Label>
                  <Textarea
                    id="create-description"
                    value={createFormData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateFormData((prev: CreateTransactionInput) => ({
                        ...prev,
                        description: e.target.value
                      }))
                    }
                    placeholder="What was this transaction for?"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-type">Type</Label>
                  <Select
                    value={createFormData.type}
                    onValueChange={(value) =>
                      setCreateFormData((prev: CreateTransactionInput) => ({
                        ...prev,
                        type: value as 'income' | 'expense'
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="create-category">Category</Label>
                  <Select
                    value={createFormData.category_id?.toString() || ''}
                    onValueChange={(value) =>
                      setCreateFormData((prev: CreateTransactionInput) => ({
                        ...prev,
                        category_id: value ? parseInt(value) : null
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No category</SelectItem>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="create-date">Date</Label>
                  <Input
                    id="create-date"
                    type="date"
                    value={createFormData.date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateTransactionInput) => ({
                        ...prev,
                        date: new Date(e.target.value)
                      }))
                    }
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreateLoading}>
                    {isCreateLoading ? 'Creating...' : 'Create Transaction'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedTransactions.length > 0 ? (
            <div className="space-y-3">
              {sortedTransactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getCategoryColor(transaction.category_id) }}
                    />
                    <div>
                      <h4 className="font-medium">{transaction.description}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{getCategoryName(transaction.category_id)}</span>
                        <span>•</span>
                        <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <Badge 
                        variant={transaction.type === 'income' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openEditDialog(transaction)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this transaction? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💸</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-600 mb-4">
                Start tracking your finances by adding your first transaction
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <form onSubmit={handleEditTransaction} className="space-y-4">
              <div>
                <Label htmlFor="edit-amount">Amount ($)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.amount || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateTransactionInput>) => ({
                      ...prev,
                      amount: parseFloat(e.target.value) || 0
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditFormData((prev: Partial<UpdateTransactionInput>) => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={editFormData.type || 'expense'}
                  onValueChange={(value) =>
                    setEditFormData((prev: Partial<UpdateTransactionInput>) => ({
                      ...prev,
                      type: value as 'income' | 'expense'
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editFormData.category_id?.toString() || ''}
                  onValueChange={(value) =>
                    setEditFormData((prev: Partial<UpdateTransactionInput>) => ({
                      ...prev,
                      category_id: value ? parseInt(value) : null
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No category</SelectItem>
                    {categories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.date ? editFormData.date.toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateTransactionInput>) => ({
                      ...prev,
                      date: new Date(e.target.value)
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditLoading}>
                  {isEditLoading ? 'Updating...' : 'Update Transaction'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}