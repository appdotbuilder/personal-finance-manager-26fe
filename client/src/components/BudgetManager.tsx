import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Budget, 
  Category, 
  BudgetStatus,
  CreateBudgetInput, 
  UpdateBudgetInput 
} from '../../../server/src/schema';

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  budgetStatus: BudgetStatus[];
  onBudgetCreated: () => Promise<void>;
  onBudgetUpdated: () => Promise<void>;
  onBudgetDeleted: () => Promise<void>;
  onBudgetStatusRefresh: () => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export function BudgetManager({
  budgets,
  categories,
  budgetStatus,
  onBudgetCreated,
  onBudgetUpdated,
  onBudgetDeleted,
  onBudgetStatusRefresh,
  formatCurrency
}: BudgetManagerProps) {
  // Form states
  const [createFormData, setCreateFormData] = useState<CreateBudgetInput>({
    category_id: 0,
    amount: 0,
    period: 'monthly',
    start_date: new Date(),
    end_date: null
  });
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UpdateBudgetInput>>({});
  
  // UI states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getCategoryColor = (categoryId: number): string => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  // Create budget
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreateLoading(true);
    try {
      // Convert dollars to cents
      const amountInCents = Math.round(createFormData.amount * 100);
      await trpc.createBudget.mutate({
        ...createFormData,
        amount: amountInCents
      });
      await onBudgetCreated();
      await onBudgetStatusRefresh();
      setCreateFormData({
        category_id: 0,
        amount: 0,
        period: 'monthly',
        start_date: new Date(),
        end_date: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create budget:', error);
    } finally {
      setIsCreateLoading(false);
    }
  };

  // Edit budget
  const handleEditBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    
    setIsEditLoading(true);
    try {
      const updateData: UpdateBudgetInput = {
        id: editingBudget.id,
        ...editFormData
      };
      
      // Convert amount to cents if provided
      if (editFormData.amount !== undefined) {
        updateData.amount = Math.round(editFormData.amount * 100);
      }

      await trpc.updateBudget.mutate(updateData);
      await onBudgetUpdated();
      await onBudgetStatusRefresh();
      setEditingBudget(null);
      setEditFormData({});
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update budget:', error);
    } finally {
      setIsEditLoading(false);
    }
  };

  // Delete budget
  const handleDeleteBudget = async (budgetId: number) => {
    try {
      await trpc.deleteBudget.mutate(budgetId);
      await onBudgetDeleted();
      await onBudgetStatusRefresh();
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  // Open edit dialog
  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setEditFormData({
      category_id: budget.category_id,
      amount: budget.amount / 100, // Convert cents to dollars
      period: budget.period,
      start_date: new Date(budget.start_date),
      end_date: budget.end_date ? new Date(budget.end_date) : null
    });
    setIsEditDialogOpen(true);
  };

  // Get budget status for a specific budget
  const getBudgetStatusForBudget = (budgetId: number): BudgetStatus | null => {
    return budgetStatus.find((status: BudgetStatus) => status.id === budgetId) || null;
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Budget Management</h2>
          <p className="text-gray-600">Set spending limits and track your budget performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onBudgetStatusRefresh} variant="outline">
            Refresh Status
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Budget</DialogTitle>
                <DialogDescription>
                  Set a spending limit for a specific category
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateBudget} className="space-y-4">
                <div>
                  <Label htmlFor="create-category">Category</Label>
                  <Select
                    value={createFormData.category_id.toString()}
                    onValueChange={(value) =>
                      setCreateFormData((prev: CreateBudgetInput) => ({
                        ...prev,
                        category_id: parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="create-amount">Budget Amount ($)</Label>
                  <Input
                    id="create-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={createFormData.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateBudgetInput) => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-period">Period</Label>
                  <Select
                    value={createFormData.period}
                    onValueChange={(value) =>
                      setCreateFormData((prev: CreateBudgetInput) => ({
                        ...prev,
                        period: value as 'weekly' | 'monthly' | 'yearly'
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="create-start-date">Start Date</Label>
                  <Input
                    id="create-start-date"
                    type="date"
                    value={createFormData.start_date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateBudgetInput) => ({
                        ...prev,
                        start_date: new Date(e.target.value)
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-end-date">End Date (Optional)</Label>
                  <Input
                    id="create-end-date"
                    type="date"
                    value={createFormData.end_date ? createFormData.end_date.toISOString().split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateBudgetInput) => ({
                        ...prev,
                        end_date: e.target.value ? new Date(e.target.value) : null
                      }))
                    }
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
                    {isCreateLoading ? 'Creating...' : 'Create Budget'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Status Cards */}
      {budgetStatus.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgetStatus.map((status: BudgetStatus) => (
            <Card key={status.id} className={`${status.is_over_budget ? 'border-red-200 bg-red-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getCategoryColor(status.category_id) }}
                    />
                    {status.category_name}
                  </CardTitle>
                  {status.is_over_budget && (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <CardDescription>
                  {status.period.charAt(0).toUpperCase() + status.period.slice(1)} budget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <Badge 
                      variant={status.is_over_budget ? 'destructive' : status.percentage_used > 80 ? 'secondary' : 'default'}
                    >
                      {status.percentage_used.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.min(status.percentage_used, 100)}
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Spent</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(status.spent_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget</span>
                    <span className="font-medium">
                      {formatCurrency(status.budget_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Remaining</span>
                    <span className={`font-medium ${
                      status.remaining_amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {status.remaining_amount >= 0 ? (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {formatCurrency(status.remaining_amount)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Over by {formatCurrency(Math.abs(status.remaining_amount))}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 pt-2 border-t">
                  {new Date(status.start_date).toLocaleDateString()} - {
                    status.end_date 
                      ? new Date(status.end_date).toLocaleDateString()
                      : 'Ongoing'
                  }
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* All Budgets List */}
      <Card>
        <CardHeader>
          <CardTitle>All Budgets</CardTitle>
          <CardDescription>
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {budgets.length > 0 ? (
            <div className="space-y-3">
              {budgets.map((budget: Budget) => {
                const status = getBudgetStatusForBudget(budget.id);
                return (
                  <div key={budget.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: getCategoryColor(budget.category_id) }}
                      />
                      <div>
                        <h4 className="font-medium">{getCategoryName(budget.category_id)}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{formatCurrency(budget.amount)} {budget.period}</span>
                          <span>•</span>
                          <span>
                            {new Date(budget.start_date).toLocaleDateString()}
                            {budget.end_date && ` - ${new Date(budget.end_date).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {status && (
                        <div className="text-right">
                          <Badge 
                            variant={status.is_over_budget ? 'destructive' : status.percentage_used > 80 ? 'secondary' : 'default'}
                          >
                            {status.percentage_used.toFixed(0)}% used
                          </Badge>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatCurrency(status.spent_amount)} / {formatCurrency(status.budget_amount)}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openEditDialog(budget)}
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
                              <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this budget? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteBudget(budget.id)}
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
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets created yet</h3>
              <p className="text-gray-600 mb-4">
                Set spending limits to better control your finances
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Budget
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Budget Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Update budget details
            </DialogDescription>
          </DialogHeader>
          {editingBudget && (
            <form onSubmit={handleEditBudget} className="space-y-4">
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editFormData.category_id?.toString() || ''}
                  onValueChange={(value) =>
                    setEditFormData((prev: Partial<UpdateBudgetInput>) => ({
                      ...prev,
                      category_id: parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-amount">Budget Amount ($)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.amount || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateBudgetInput>) => ({
                      ...prev,
                      amount: parseFloat(e.target.value) || 0
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-period">Period</Label>
                <Select
                  value={editFormData.period || 'monthly'}
                  onValueChange={(value) =>
                    setEditFormData((prev: Partial<UpdateBudgetInput>) => ({
                      ...prev,
                      period: value as 'weekly' | 'monthly' | 'yearly'
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editFormData.start_date ? editFormData.start_date.toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateBudgetInput>) => ({
                      ...prev,
                      start_date: new Date(e.target.value)
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-end-date">End Date (Optional)</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editFormData.end_date ? editFormData.end_date.toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateBudgetInput>) => ({
                      ...prev,
                      end_date: e.target.value ? new Date(e.target.value) : null
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
                  {isEditLoading ? 'Updating...' : 'Update Budget'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}