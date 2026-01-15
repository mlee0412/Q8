'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { Play, RefreshCw, TrendingUp, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNetWorth, useLiquidAssets, useInvestments } from '@/lib/stores/financehub';
import { formatCurrency, formatCompactCurrency } from '@/types/finance';

interface WealthSimulatorProps {
  className?: string;
}

interface SimulationResult {
  year: number;
  baseline: number;
  scenario: number;
  low: number;
  high: number;
}

interface MajorPurchase {
  id: string;
  description: string;
  amount: number;
  year: number;
}

/**
 * WealthSimulator Component
 *
 * Monte Carlo wealth projection with interactive controls:
 * - Adjustable monthly contribution
 * - Expected return rate
 * - Major purchase planning
 * - Confidence intervals
 */
export function WealthSimulator({ className }: WealthSimulatorProps) {
  const currentNetWorth = useNetWorth();
  const liquidAssets = useLiquidAssets();
  const investments = useInvestments();

  // Simulation parameters
  const [years, setYears] = useState(20);
  const [monthlyContribution, setMonthlyContribution] = useState(1000);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [inflationRate, setInflationRate] = useState(2.5);
  const [majorPurchases, setMajorPurchases] = useState<MajorPurchase[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // New purchase form
  const [newPurchaseDesc, setNewPurchaseDesc] = useState('');
  const [newPurchaseAmount, setNewPurchaseAmount] = useState('');
  const [newPurchaseYear, setNewPurchaseYear] = useState('5');

  /**
   * Run Monte Carlo simulation
   */
  const runSimulation = useCallback((): SimulationResult[] => {
    const results: SimulationResult[] = [];
    const numSimulations = 1000;
    const monthlyReturn = expectedReturn / 100 / 12;
    const monthlyVolatility = 0.15 / Math.sqrt(12); // Annualized 15% volatility
    const realReturn = (expectedReturn - inflationRate) / 100 / 12;

    // Run Monte Carlo simulations
    const simulations: number[][] = [];

    for (let sim = 0; sim < numSimulations; sim++) {
      const path: number[] = [];
      let balance = currentNetWorth;

      for (let month = 0; month <= years * 12; month++) {
        // Random return with normal distribution approximation
        const randomReturn = monthlyReturn + monthlyVolatility * (Math.random() + Math.random() + Math.random() - 1.5) * 2;
        
        // Apply monthly return and contribution
        balance = balance * (1 + randomReturn) + monthlyContribution;

        // Apply major purchases
        const yearFloat = month / 12;
        for (const purchase of majorPurchases) {
          if (Math.abs(yearFloat - purchase.year) < 0.042) { // Within half a month
            balance -= purchase.amount;
          }
        }

        // Record yearly values
        if (month % 12 === 0) {
          path.push(Math.max(0, balance));
        }
      }
      simulations.push(path);
    }

    // Calculate percentiles for each year
    for (let year = 0; year <= years; year++) {
      const yearValues = simulations.map((sim) => sim[year] ?? 0).sort((a, b) => (a ?? 0) - (b ?? 0));
      
      // Baseline: deterministic growth
      let baseline = currentNetWorth;
      for (let m = 0; m < year * 12; m++) {
        baseline = baseline * (1 + realReturn) + monthlyContribution;
        const yearFloat = m / 12;
        for (const purchase of majorPurchases) {
          if (Math.abs(yearFloat - purchase.year) < 0.042) {
            baseline -= purchase.amount;
          }
        }
      }

      // Scenario: with contributions
      let scenario = currentNetWorth;
      for (let m = 0; m < year * 12; m++) {
        scenario = scenario * (1 + monthlyReturn) + monthlyContribution;
        const yearFloat = m / 12;
        for (const purchase of majorPurchases) {
          if (Math.abs(yearFloat - purchase.year) < 0.042) {
            scenario -= purchase.amount;
          }
        }
      }

      results.push({
        year: new Date().getFullYear() + year,
        baseline: Math.max(0, baseline),
        scenario: Math.max(0, scenario),
        low: yearValues[Math.floor(numSimulations * 0.1)] || 0, // 10th percentile
        high: yearValues[Math.floor(numSimulations * 0.9)] || 0, // 90th percentile
      });
    }

    return results;
  }, [currentNetWorth, years, monthlyContribution, expectedReturn, inflationRate, majorPurchases]);

  // Run simulation
  const [simulationData, setSimulationData] = useState<SimulationResult[]>([]);

  const handleSimulate = useCallback(() => {
    setIsSimulating(true);
    // Simulate async to allow UI update
    setTimeout(() => {
      const results = runSimulation();
      setSimulationData(results);
      setIsSimulating(false);
    }, 100);
  }, [runSimulation]);

  // Add major purchase
  const handleAddPurchase = () => {
    if (!newPurchaseDesc || !newPurchaseAmount) return;
    
    setMajorPurchases([
      ...majorPurchases,
      {
        id: `purchase-${Date.now()}`,
        description: newPurchaseDesc,
        amount: parseFloat(newPurchaseAmount),
        year: parseInt(newPurchaseYear) || 5,
      },
    ]);
    setNewPurchaseDesc('');
    setNewPurchaseAmount('');
    setNewPurchaseYear('5');
  };

  // Remove major purchase
  const handleRemovePurchase = (id: string) => {
    setMajorPurchases(majorPurchases.filter((p) => p.id !== id));
  };

  // Final projections
  const finalProjection = simulationData[simulationData.length - 1];
  const totalContributed = monthlyContribution * 12 * years;
  const projectedGrowth = finalProjection ? finalProjection.scenario - currentNetWorth - totalContributed : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-neon-primary" />
            Wealth Simulator
          </h3>
          <p className="text-sm text-white/60">
            Monte Carlo projection with {years} year horizon
          </p>
        </div>
        <Button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="bg-neon-primary hover:bg-neon-primary/90"
        >
          {isSimulating ? (
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          Run Simulation
        </Button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-white/60 mb-1">Years</label>
          <Input
            type="number"
            min="1"
            max="50"
            value={years}
            onChange={(e) => setYears(parseInt(e.target.value) || 20)}
            className="bg-surface-3 border-border-subtle"
          />
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-1">Monthly Contribution</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">$</span>
            <Input
              type="number"
              min="0"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(parseInt(e.target.value) || 0)}
              className="pl-7 bg-surface-3 border-border-subtle"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-1">Expected Return %</label>
          <Input
            type="number"
            min="0"
            max="20"
            step="0.5"
            value={expectedReturn}
            onChange={(e) => setExpectedReturn(parseFloat(e.target.value) || 7)}
            className="bg-surface-3 border-border-subtle"
          />
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-1">Inflation %</label>
          <Input
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={inflationRate}
            onChange={(e) => setInflationRate(parseFloat(e.target.value) || 2.5)}
            className="bg-surface-3 border-border-subtle"
          />
        </div>
      </div>

      {/* Major Purchases */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-neon-primary hover:text-neon-primary/80 mb-2"
        >
          {showAdvanced ? '▼' : '▶'} Major Purchases ({majorPurchases.length})
        </button>
        
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="space-y-3 p-4 rounded-xl bg-surface-3/50 border border-border-subtle"
          >
            {/* Existing purchases */}
            {majorPurchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between text-sm">
                <span>{purchase.description}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">
                    {formatCurrency(purchase.amount)} in Year {purchase.year}
                  </span>
                  <button
                    onClick={() => handleRemovePurchase(purchase.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            {/* Add new purchase */}
            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <Input
                type="text"
                placeholder="Description"
                value={newPurchaseDesc}
                onChange={(e) => setNewPurchaseDesc(e.target.value)}
                className="flex-1 bg-surface-3 border-border-subtle text-sm"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={newPurchaseAmount}
                onChange={(e) => setNewPurchaseAmount(e.target.value)}
                className="w-28 bg-surface-3 border-border-subtle text-sm"
              />
              <Input
                type="number"
                placeholder="Year"
                min="1"
                max={years}
                value={newPurchaseYear}
                onChange={(e) => setNewPurchaseYear(e.target.value)}
                className="w-20 bg-surface-3 border-border-subtle text-sm"
              />
              <Button size="sm" onClick={handleAddPurchase}>Add</Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Chart */}
      {simulationData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-surface-3/30 border border-border-subtle p-4"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={simulationData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D9FF" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00D9FF" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="year" 
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  tickFormatter={(value) => formatCompactCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'white' }}
                  formatter={(value, name) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    const strName = typeof name === 'string' ? name : '';
                    return [
                      formatCurrency(numValue),
                      strName === 'scenario' ? 'Projected' : strName === 'baseline' ? 'Conservative' : strName,
                    ];
                  }}
                />
                <Legend />
                
                {/* Confidence interval area */}
                <Area
                  type="monotone"
                  dataKey="high"
                  stroke="none"
                  fill="url(#confidenceGradient)"
                  name="90th Percentile"
                />
                <Area
                  type="monotone"
                  dataKey="low"
                  stroke="none"
                  fill="transparent"
                  name="10th Percentile"
                />
                
                {/* Main projection lines */}
                <Line
                  type="monotone"
                  dataKey="scenario"
                  stroke="#00D9FF"
                  strokeWidth={2}
                  dot={false}
                  name="Projected"
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#888888"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Conservative"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border-subtle">
            <div className="text-center">
              <div className="text-xs text-white/60 mb-1">Starting Net Worth</div>
              <div className="text-lg font-semibold">{formatCompactCurrency(currentNetWorth)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/60 mb-1">Total Contributions</div>
              <div className="text-lg font-semibold text-blue-400">
                +{formatCompactCurrency(totalContributed)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/60 mb-1">
                Projected in {years} Years
              </div>
              <div className="text-lg font-semibold text-green-400">
                {formatCompactCurrency(finalProjection?.scenario || 0)}
              </div>
            </div>
          </div>

          {/* Growth breakdown */}
          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-medium">
                Projected Growth: {formatCurrency(projectedGrowth)}
              </span>
              <span className="text-white/50">
                ({((projectedGrowth / (currentNetWorth + totalContributed)) * 100).toFixed(1)}% return on invested capital)
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {simulationData.length === 0 && (
        <div className="text-center py-16 rounded-xl bg-surface-3/30 border border-border-subtle">
          <Target className="h-12 w-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50 mb-4">
            Adjust parameters and click Run Simulation to see your wealth projection
          </p>
          <Button onClick={handleSimulate} disabled={isSimulating}>
            <Play className="h-4 w-4 mr-1" />
            Run Simulation
          </Button>
        </div>
      )}
    </div>
  );
}

WealthSimulator.displayName = 'WealthSimulator';
