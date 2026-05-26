// src/components/StatCard.jsx
export default function StatCard({ icon, color, title, value, trend = '' }) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`
        ${style.bg} ${style.border} border rounded-xl p-6 shadow-sm
        hover:shadow-md transition-all duration-200 hover:-translate-y-0.5
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-3xl mb-3 ${style.text}`}>
            <i className={icon}></i>
          </div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
        <div className="text-right">
          <div className="text-3xl md:text-4xl font-bold text-gray-900">
            {value}
            {trend && <span className="text-sm ml-1.5 text-green-600">{trend}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}