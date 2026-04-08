import axios from 'axios';
import { env } from '../../../config/env';
import type { Resume, ResumeSection, ResumeUploadResponse } from '../types/resume.types';


export const resumeService = {
  // POST /resumes/upload - Upload resume
  async uploadResume(file: File): Promise<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${env.API_URL}/resumes/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // GET /resumes/me - Get candidate's resumes
  async getMyResumes(): Promise<Resume[]> {
    const response = await axios.get(`${env.API_URL}/resumes/me`);
    return response.data;
  },

  // GET /resumes/download - Download latest resume
  async downloadResume(): Promise<{ download_url: string }> {
    const response = await axios.get(`${env.API_URL}/resumes/download`);
    return response.data;
  },

  // GET /resumes/{resume_id}/sections - Get parsed sections
  async getResumeSections(resumeId: number): Promise<ResumeSection[]> {
    const response = await axios.get(`${env.API_URL}/resumes/${resumeId}/sections`);
    return response.data;
  },
};