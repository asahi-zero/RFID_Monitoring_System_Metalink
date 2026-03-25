import { Card } from '@/app/components/ui/card';
import { mockAreaActivities } from '@/app/data/mockData';
import { MapPin, Users } from 'lucide-react';

export function ActivityMonitoring() {
  return (
    <div className="p-8">
      <h1 className="text-3xl mb-8">Activity & Presence Monitoring</h1>

      <div className="mb-6">
        <Card className="p-6 bg-[#E5F5FC] border-[#0099DD]">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-[#0099DD]" />
            <div>
              <h2 className="text-xl">Real-Time Area Monitoring</h2>
              <p className="text-gray-600">Track employee locations across factory areas</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAreaActivities.map((area) => (
          <Card key={area.area} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl mb-1">{area.area}</h3>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{area.count} {area.count === 1 ? 'Worker' : 'Workers'}</span>
                </div>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-[#E5F5FC] rounded-full">
                <span className="text-xl text-[#0099DD]">{area.count}</span>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Active Employees:</p>
              <ul className="space-y-2">
                {area.employees.map((employee, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{employee}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card className="p-6">
          <h2 className="text-xl mb-4">Area Capacity Overview</h2>
          <div className="space-y-4">
            {mockAreaActivities.map((area) => (
              <div key={area.area}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{area.area}</span>
                  <span className="text-sm text-gray-600">{area.count} / 10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#0099DD] h-2 rounded-full transition-all"
                    style={{ width: `${(area.count / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}