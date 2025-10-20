// frontend/src/components/ParticipantFunding.tsx - FIXED VERSION

import React, { useState } from 'react';
import { DollarSign, Calendar, TrendingUp, AlertTriangle, Plus, Edit, Trash2 } from 'lucide-react';

interface FundingPackage {
  id: number;
  name: string;
  category: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'pending';
}

interface ParticipantFundingProps {
  participantId: number;
  fundingPackages: FundingPackage[];
  onAddFunding?: () => void;
  onEditFunding?: (packageId: number) => void;
  onDeleteFunding?: (packageId: number) => void;
}

export const ParticipantFunding: React.FC<ParticipantFundingProps> = ({
  participantId,
  fundingPackages,
  onAddFunding,
  onEditFunding,
  onDeleteFunding
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'core_supports', 'capacity_building', 'capital_supports'];
  
  const filteredPackages = selectedCategory === 'all' 
    ? fundingPackages 
    : fundingPackages.filter(pkg => pkg.category === selectedCategory);

  const totalAllocated = fundingPackages.reduce((sum, pkg) => sum + pkg.allocated_amount, 0);
  const totalSpent = fundingPackages.reduce((sum, pkg) => sum + pkg.spent_amount, 0);
  const totalRemaining = fundingPackages.reduce((sum, pkg) => sum + pkg.remaining_amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUtilizationPercentage = (spent: number, allocated: number) => {
    return allocated > 0 ? (spent / allocated) * 100 : 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <DollarSign className="text-blue-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAllocated)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <TrendingUp className="text-green-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <Calendar className="text-purple-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Remaining</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRemaining)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Utilization */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Fund Utilization</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium text-gray-900">
            {getUtilizationPercentage(totalSpent, totalAllocated).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(getUtilizationPercentage(totalSpent, totalAllocated), 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatCurrency(totalSpent)} spent</span>
          <span>{formatCurrency(totalAllocated)} allocated</span>
        </div>
      </div>

      {/* Funding Packages */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Funding Packages</h3>
            {onAddFunding && (
              <button
                onClick={onAddFunding}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Package
              </button>
            )}
          </div>
          
          {/* Category Filter */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All Categories' : 
                   category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredPackages.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto text-gray-300 mb-4" size={48} />
              <h4 className="text-lg font-medium text-gray-500 mb-2">No Funding Packages</h4>
              <p className="text-gray-400">
                {selectedCategory === 'all' 
                  ? 'No funding packages have been set up for this participant' 
                  : 'No packages found for the selected category'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPackages.map(pkg => {
                const utilizationPercentage = getUtilizationPercentage(pkg.spent_amount, pkg.allocated_amount);
                const isHighUtilization = utilizationPercentage > 80;
                const isExpiringSoon = new Date(pkg.end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                return (
                  <div key={pkg.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {pkg.category.replace('_', ' ')}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(pkg.status)}`}>
                          {pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1)}
                        </span>
                        
                        {(isHighUtilization || isExpiringSoon) && (
                          <AlertTriangle 
                            className="text-yellow-500" 
                            size={16}
                            title={isHighUtilization ? 'High utilization' : 'Expiring soon'}
                          />
                        )}
                        
                        {onEditFunding && (
                          <button
                            onClick={() => onEditFunding(pkg.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        
                        {onDeleteFunding && (
                          <button
                            onClick={() => onDeleteFunding(pkg.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Allocated</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(pkg.allocated_amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Spent</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(pkg.spent_amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Remaining</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(pkg.remaining_amount)}</p>
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Utilization</span>
                        <span className={`text-sm font-medium ${
                          isHighUtilization ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {utilizationPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isHighUtilization ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Start: {formatDate(pkg.start_date)}</span>
                      <span className={isExpiringSoon ? 'text-yellow-600 font-medium' : ''}>
                        End: {formatDate(pkg.end_date)}
                      </span>
                    </div>

                    {/* Warnings */}
                    {(isHighUtilization || isExpiringSoon) && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        {isHighUtilization && (
                          <div className="text-yellow-800">
                            ⚠️ High utilization: {utilizationPercentage.toFixed(1)}% of funds used
                          </div>
                        )}
                        {isExpiringSoon && (
                          <div className="text-yellow-800">
                            ⏰ Package expires on {formatDate(pkg.end_date)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantFunding;