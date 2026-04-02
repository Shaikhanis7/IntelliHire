import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { PageHeader } from '../components/common/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Filter, Download, Eye, Star } from 'lucide-react';
import type { RootState } from '../app/store';
import { resumeService } from '../features/resume/services/resume.service';

type UserRole = 'admin' | 'recruiter' | 'viewer' | 'candidate';


const ResumeSearchPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [resumes, setResumes] = useState<any[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await resumeService.uploadResume(file);
      alert('Resume uploaded successfully!');
      // Reload resumes list
    } catch (error) {
      alert('Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={user?.role === 'recruiter' ? 'Resume Search' : 'My Resumes'}
        description={user?.role === 'recruiter' ? 'Search and filter through candidate resumes' : 'Manage your uploaded resumes'}
      />

      {(user?.role as UserRole) === 'candidate' ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Upload New Resume</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className="cursor-pointer inline-flex flex-col items-center"
                >
                  <Download className="h-12 w-12 text-gray-400 mb-3" />
                  <span className="text-blue-600 font-medium">Click to upload</span>
                  <span className="text-sm text-gray-500 mt-1">or drag and drop</span>
                  <span className="text-xs text-gray-400 mt-2">PDF, DOC, DOCX (Max 5MB)</span>
                </label>
              </div>
              {uploading && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 inline-block"></div>
                  <span className="ml-2 text-sm text-gray-600">Uploading...</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Your Resumes</h3>
              <div className="space-y-3">
                {resumes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No resumes uploaded yet</p>
                ) : (
                  resumes.map((resume) => (
                    <div key={resume.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Resume v{resume.version}</p>
                        <p className="text-sm text-gray-500">Uploaded on {new Date(resume.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by skills, experience, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
              <Button variant="primary">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} variant="shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">John Doe</h3>
                      <p className="text-gray-600 mt-1">Senior Frontend Developer with 5+ years experience</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">React</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">TypeScript</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">Node.js</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">Python</span>
                      </div>
                      <div className="mt-3 text-sm text-gray-500">
                        <span>📍 San Francisco, CA</span>
                        <span className="ml-4">💼 5 years experience</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="primary" size="sm">
                        <Star className="h-4 w-4 mr-1" />
                        Shortlist
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View Resume
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ResumeSearchPage;