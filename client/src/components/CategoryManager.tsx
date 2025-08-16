import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Palette } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Category, 
  CreateCategoryInput, 
  UpdateCategoryInput 
} from '../../../server/src/schema';

interface CategoryManagerProps {
  categories: Category[];
  onCategoryCreated: () => Promise<void>;
  onCategoryUpdated: () => Promise<void>;
  onCategoryDeleted: () => Promise<void>;
}

// Predefined color palette for categories
const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#84cc16', // lime
  '#f59e0b', // amber
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#a855f7', // purple
  '#e11d48', // rose
];

// Common emoji icons for categories
const COMMON_ICONS = [
  '🍔', '🛒', '⛽', '🏠', '💡', '📱', '🚗', '🎬', '👕', '💊',
  '📚', '🏃‍♂️', '✈️', '🍜', '☕', '🎵', '💰', '🏦', '🎁', '🛠️',
  '🧾', '📄', '🎯', '📈', '💳', '🏪', '🍕', '🚌', '🏥', '🎓'
];

export function CategoryManager({
  categories,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted
}: CategoryManagerProps) {
  // Form states
  const [createFormData, setCreateFormData] = useState<CreateCategoryInput>({
    name: '',
    color: COLOR_PALETTE[0],
    icon: null
  });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UpdateCategoryInput>>({});
  
  // UI states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Create category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreateLoading(true);
    try {
      await trpc.createCategory.mutate(createFormData);
      await onCategoryCreated();
      setCreateFormData({
        name: '',
        color: COLOR_PALETTE[0],
        icon: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsCreateLoading(false);
    }
  };

  // Edit category
  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    
    setIsEditLoading(true);
    try {
      const updateData: UpdateCategoryInput = {
        id: editingCategory.id,
        ...editFormData
      };

      await trpc.updateCategory.mutate(updateData);
      await onCategoryUpdated();
      setEditingCategory(null);
      setEditFormData({});
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setIsEditLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: number) => {
    try {
      await trpc.deleteCategory.mutate(categoryId);
      await onCategoryDeleted();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  // Open edit dialog
  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setEditFormData({
      name: category.name,
      color: category.color,
      icon: category.icon
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
          <p className="text-gray-600">Organize your transactions with custom categories</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new category to organize your transactions
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <Label htmlFor="create-name">Category Name</Label>
                <Input
                  id="create-name"
                  value={createFormData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateFormData((prev: CreateCategoryInput) => ({
                      ...prev,
                      name: e.target.value
                    }))
                  }
                  placeholder="e.g., Food & Dining, Transportation"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="create-color">Category Color</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: createFormData.color }}
                    />
                    <Input
                      id="create-color"
                      type="color"
                      value={createFormData.color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateCategoryInput) => ({
                          ...prev,
                          color: e.target.value
                        }))
                      }
                      className="w-20"
                    />
                  </div>
                  <div className="grid grid-cols-8 gap-2">
                    {COLOR_PALETTE.map((color: string) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-lg border-2 ${
                          createFormData.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          setCreateFormData((prev: CreateCategoryInput) => ({
                            ...prev,
                            color: color
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="create-icon">Category Icon (Optional)</Label>
                <div className="space-y-3">
                  <Input
                    id="create-icon"
                    value={createFormData.icon || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateCategoryInput) => ({
                        ...prev,
                        icon: e.target.value || null
                      }))
                    }
                    placeholder="Enter emoji or leave empty"
                    maxLength={2}
                  />
                  <div className="grid grid-cols-10 gap-2">
                    {COMMON_ICONS.map((icon: string) => (
                      <button
                        key={icon}
                        type="button"
                        className={`w-8 h-8 rounded border text-lg hover:bg-gray-100 ${
                          createFormData.icon === icon ? 'bg-gray-200' : ''
                        }`}
                        onClick={() =>
                          setCreateFormData((prev: CreateCategoryInput) => ({
                            ...prev,
                            icon: icon
                          }))
                        }
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
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
                  {isCreateLoading ? 'Creating...' : 'Create Category'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category: Category) => (
          <Card key={category.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg text-white text-2xl" style={{ backgroundColor: category.color }}>
                    {category.icon || <Palette className="h-6 w-6" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription>
                      Created {new Date(category.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-end gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openEditDialog(category)}
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
                      <AlertDialogTitle>Delete Category</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{category.name}"? This action cannot be undone and will affect existing transactions using this category.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteCategory(category.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {categories.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🏷️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories created yet</h3>
            <p className="text-gray-600 mb-4">
              Create categories to organize and track your transactions more effectively
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category details
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <form onSubmit={handleEditCategory} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Category Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateCategoryInput>) => ({
                      ...prev,
                      name: e.target.value
                    }))
                  }
                  placeholder="Category name"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-color">Category Color</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: editFormData.color || editingCategory.color }}
                    />
                    <Input
                      id="edit-color"
                      type="color"
                      value={editFormData.color || editingCategory.color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: Partial<UpdateCategoryInput>) => ({
                          ...prev,
                          color: e.target.value
                        }))
                      }
                      className="w-20"
                    />
                  </div>
                  <div className="grid grid-cols-8 gap-2">
                    {COLOR_PALETTE.map((color: string) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-lg border-2 ${
                          (editFormData.color || editingCategory.color) === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          setEditFormData((prev: Partial<UpdateCategoryInput>) => ({
                            ...prev,
                            color: color
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-icon">Category Icon (Optional)</Label>
                <div className="space-y-3">
                  <Input
                    id="edit-icon"
                    value={editFormData.icon !== undefined ? (editFormData.icon || '') : (editingCategory.icon || '')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: Partial<UpdateCategoryInput>) => ({
                        ...prev,
                        icon: e.target.value || null
                      }))
                    }
                    placeholder="Enter emoji or leave empty"
                    maxLength={2}
                  />
                  <div className="grid grid-cols-10 gap-2">
                    {COMMON_ICONS.map((icon: string) => (
                      <button
                        key={icon}
                        type="button"
                        className={`w-8 h-8 rounded border text-lg hover:bg-gray-100 ${
                          (editFormData.icon !== undefined ? editFormData.icon : editingCategory.icon) === icon ? 'bg-gray-200' : ''
                        }`}
                        onClick={() =>
                          setEditFormData((prev: Partial<UpdateCategoryInput>) => ({
                            ...prev,
                            icon: icon
                          }))
                        }
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
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
                  {isEditLoading ? 'Updating...' : 'Update Category'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}