import React from 'react';
import { useSelector } from 'react-redux';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Building2, Mail, Phone, Globe, Edit2 } from 'lucide-react';
import type { RootState } from '../app/store';

const CompanyProfilePage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div>
      <PageHeader
        title="Company Profile"
        description="Manage your company information"
        actions={
          <Button variant="outline">
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="shadow">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">TechCorp Inc.</h3>
                  <p className="text-gray-600 mt-1">Technology & Software</p>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-3">
                <p className="text-gray-700">
                  Leading technology company specializing in AI-powered recruitment solutions.
                  We help businesses find the best talent efficiently.
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>contact@techcorp.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Globe className="h-4 w-4" />
                    <span>www.techcorp.com</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card variant="shadow">
            <CardHeader>
              <CardTitle>Company Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">250+</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Open Positions</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Hires This Year</p>
                <p className="text-2xl font-bold text-gray-900">48</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfilePage;