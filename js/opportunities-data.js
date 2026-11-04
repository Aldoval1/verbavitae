/**
 * Verba Vitae Opportunities Registry & Data Model
 * Reusable system for internal projects, creative initiatives, and volunteer roles.
 */

const VERBA_OPPORTUNITIES = [
    {
        id: 'poetry-in-motion',
        title: 'Verba in Motion',
        tagline: 'Be part of Verba in Motion',
        subtitle: 'Bring literature to life through animation, illustration, and film.',
        heroImage: 'images/slide1.jpg',
        badge: 'Creative Production',
        status: 'open', // 'open', 'reviewing', 'closed'
        deadline: 'Open Application',
        shortDescription: 'Transform written poems, short literary works, and original writing into visual short-form video experiences using claymation, illustration, stop-motion, and video editing.',
        fullDescription: `Poetry in Motion is a Verba Vitae creative project where poetry, short literary works, and original writing are transformed into visual experiences.

Each production begins with a written piece and recorded narration. A creative team then develops visuals using claymation, illustration, stop-motion, or other artistic techniques. These elements are combined into a final short-form video designed for Verba Vitae's digital platforms.

No previous professional experience is required. Students interested in art, literature, animation, filmmaking, editing, or creative direction are encouraged to apply.`,
        highlights: [
            'Hands-on collaborative creative production',
            'Published across Verba Vitae digital platforms & showcase',
            'Earn leadership, artistic, and community service experience',
            'Open to all Miami Dade College students'
        ],
        roles: [
            {
                id: 'project-lead',
                title: 'Project Lead & Creative Director',
                icon: 'fa-compass',
                shortDesc: 'Coordinates the project from beginning to end, guiding the creative vision and production timeline.',
                responsibilities: [
                    'Organize the creative team and facilitate team communications.',
                    'Help develop the concept for the selected poem or text.',
                    'Create and maintain a realistic production timeline.',
                    'Coordinate animators, illustrators, engineers, narrators, and editors.',
                    'Monitor overall progress and address creative hurdles.',
                    'Help review and approve the final production before release.'
                ],
                qualities: 'Strong organizational skills, collaborative mindset, passion for storytelling and creative direction.'
            },
            {
                id: 'artist-3d-2d',
                title: '3D / 2D Artist',
                icon: 'fa-shapes',
                shortDesc: 'Creates 3D digital sculptures, models, tactile physical assets, and expressive 2D animation sequences.',
                responsibilities: [
                    'Design and sculpt 3D character models, props, and environments.',
                    'Create 2D frame-by-frame animation, cel art, and illustrated overlays.',
                    'Develop textures, physical-digital hybrid materials, and lighting setups.',
                    'Plan and storyboard dynamic camera layouts and visual transitions.',
                    'Interpret literary and poetic themes visually through motion.',
                    'Collaborate closely with the Project Lead, Engineers, and Video Editor.'
                ],
                qualities: 'Interest in 3D modeling, sculpting, or 2D animation (all levels welcome), visual creativity, and attention to detail.'
            },
            {
                id: 'social-media',
                title: 'Social Media & Content',
                icon: 'fa-hashtag',
                shortDesc: 'Shapes the public narrative, behind-the-scenes teasers, and release campaigns across Instagram, TikTok, and digital channels.',
                responsibilities: [
                    'Curate engaging short-form vertical video content (Reels, TikToks, Stories).',
                    'Document the creative production process and behind-the-scenes moments.',
                    'Plan campaign schedules and rollout strategies for releases.',
                    'Engage with the student community and expand audience reach.',
                    'Coordinate with the Project Lead on promotional milestones.'
                ],
                qualities: 'Storytelling passion, eye for social video trends, community engagement mindset.'
            },
            {
                id: 'video-editor',
                title: 'Video Editor & Sound Designer',
                icon: 'fa-film',
                shortDesc: 'Combines all creative elements, audio narration, and visual layers into a cinematic final video.',
                responsibilities: [
                    'Assemble and edit animation footage, illustrations, and b-roll.',
                    'Synchronize voiceover narration with visual pacing and musical cues.',
                    'Clean, mix, and balance audio tracks and ambient sound design.',
                    'Add stylish titles, captions, subtitles, credits, and transitions.',
                    'Export master versions optimized for Instagram, TikTok, website, and archival showcase.'
                ],
                qualities: 'Technical editing curiosity, ear for pacing and audio rhythm, eye for typography.'
            },
            {
                id: 'stem-engineering',
                title: 'STEM & Creative Engineering',
                icon: 'fa-laptop-code',
                shortDesc: 'Bridges engineering, computer science, and technology with the creative arts through coding, rigging, and pipeline tools.',
                responsibilities: [
                    'Develop creative code, procedural effects, web interactions, or visual shaders.',
                    'Build physical camera rigs, motorized turntable apparatus, or lighting automation.',
                    'Automate file workflows, rendering pipelines, or audio-visual synchronization.',
                    'Collaborate with artists and animators to solve technical challenges creatively.',
                    'Document engineering experiments and technical solutions for future releases.'
                ],
                qualities: 'Curiosity in programming, robotics, hardware, physical engineering, or interactive technology applied to the arts.'
            }
        ],
        customQuestions: {
            'project-lead': [
                {
                    id: 'lead_experience',
                    label: 'Describe any previous leadership, project coordination, or group project experience.',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Share school projects, clubs, volunteer work, or informal team leadership...'
                },
                {
                    id: 'lead_deadlines',
                    label: 'How comfortable are you managing deadlines and communicating regularly with a team?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'How do you keep yourself and others organized?'
                },
                {
                    id: 'lead_organization',
                    label: 'How would you organize a creative project involving several people with different artistic styles?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Describe your approach to communication, milestones, and constructive feedback...'
                },
                {
                    id: 'lead_motivation',
                    label: 'Why are you interested in being a Project Lead for Verba in Motion?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'What excites you about guiding this production?'
                }
            ],
            'artist-3d-2d': [
                {
                    id: 'artist_medium',
                    label: 'What artistic mediums or styles do you enjoy working in? (Select all that apply)',
                    type: 'checkboxes',
                    options: [
                        '3D Modeling & Digital Sculpting (Blender, Maya, ZBrush, etc.)',
                        '2D Digital Illustration & Animation (Procreate, Photoshop, etc.)',
                        'Traditional Drawing, Painting, or Handcraft',
                        'Physical Claymation & Stop-Motion',
                        'Other'
                    ],
                    required: true
                },
                {
                    id: 'artist_tools',
                    label: 'What software, apps, or physical tools do you use or would like to learn?',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. Blender, Procreate, Photoshop, Clay, sketchbook...'
                },
                {
                    id: 'artist_experience',
                    label: 'Describe your interest or experience in 3D or 2D art (all skill levels welcome):',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Tell us about what you enjoy creating, artists who inspire you, or what you hope to explore...'
                },
                {
                    id: 'artist_file',
                    label: 'Upload examples of your art, 3D renders, sketches, or animation clips (Optional):',
                    type: 'file',
                    accept: 'image/*,video/*',
                    required: false
                },
                {
                    id: 'artist_portfolio',
                    label: 'Optional portfolio link, ArtStation, Instagram, or Google Drive folder:',
                    type: 'url',
                    required: false,
                    placeholder: 'https://...'
                }
            ],
            'social-media': [
                {
                    id: 'social_platforms',
                    label: 'Which platforms do you feel most comfortable creating content for? (Select all that apply)',
                    type: 'checkboxes',
                    options: [
                        'Instagram (Reels, Carousels, Stories)',
                        'TikTok',
                        'YouTube (Shorts & Long-form)',
                        'LinkedIn / Professional Portfolios',
                        'Other'
                    ],
                    required: true
                },
                {
                    id: 'social_experience',
                    label: 'Have you managed social channels, edited short-form reels/tiktoks, or created digital content before?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Share any personal accounts, student clubs, work, or hobbies where you created content...'
                },
                {
                    id: 'social_ideas',
                    label: 'What kind of social media content or storytelling ideas would you like to see for Verba in Motion?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'e.g. artist spotlights, time-lapses of sculpting/drawing, poetry narration teasers...'
                },
                {
                    id: 'social_link',
                    label: 'Optional social handle, content link, or portfolio:',
                    type: 'url',
                    required: false,
                    placeholder: 'https://instagram.com/...'
                }
            ],
            'video-editor': [
                {
                    id: 'editor_software',
                    label: 'What video editing software have you used? (Select all that apply)',
                    type: 'checkboxes',
                    options: [
                        'Adobe Premiere Pro',
                        'DaVinci Resolve',
                        'CapCut (Desktop or Mobile)',
                        'Final Cut Pro',
                        'Adobe After Effects',
                        'iMovie',
                        'Other'
                    ],
                    required: true
                },
                {
                    id: 'editor_experience',
                    label: 'Describe your video editing or sound design experience.',
                    type: 'textarea',
                    required: true,
                    placeholder: 'What kind of projects have you edited (YouTube, reels, short films, school projects)?'
                },
                {
                    id: 'editor_file',
                    label: 'Upload a sample video or preview (Optional):',
                    type: 'file',
                    accept: 'video/*',
                    required: false
                },
                {
                    id: 'editor_link',
                    label: 'Links to videos you have edited (YouTube, Google Drive, Vimeo, TikTok, Instagram):',
                    type: 'url',
                    required: false,
                    placeholder: 'https://...'
                }
            ],
            'stem-engineering': [
                {
                    id: 'stem_field',
                    label: 'What is your major, field of study, or technical background?',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. Computer Science, Mechanical Engineering, Electrical, Data Science, etc.'
                },
                {
                    id: 'stem_skills',
                    label: 'What programming languages, hardware, software, or technical tools do you enjoy working with?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'e.g. Python, JavaScript/Web, Arduino/Raspberry Pi, CAD/3D printing, shader coding, etc.'
                },
                {
                    id: 'stem_creative',
                    label: 'How would you like to apply your engineering or STEM knowledge to this creative project?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Share any interest in interactive websites, camera rigs, lighting automation, procedural visuals, or technical workflows...'
                },
                {
                    id: 'stem_link',
                    label: 'Optional GitHub link, technical portfolio, or project showcase:',
                    type: 'url',
                    required: false,
                    placeholder: 'https://github.com/...'
                }
            ]
        }    }
];

// Helper Functions
function getOpportunityById(id) {
    return VERBA_OPPORTUNITIES.find(o => o.id === id) || null;
}

function getAllOpportunities() {
    return VERBA_OPPORTUNITIES;
}
