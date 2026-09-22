/**
 * Verba Vitae Opportunities Registry & Data Model
 * Reusable system for internal projects, creative initiatives, and volunteer roles.
 */

const VERBA_OPPORTUNITIES = [
    {
        id: 'poetry-in-motion',
        title: 'Poetry in Motion',
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
                title: 'Project Lead',
                icon: 'fa-compass',
                shortDesc: 'Coordinates the project from beginning to end, guiding the creative vision and production timeline.',
                responsibilities: [
                    'Organize the creative team and facilitate team communications.',
                    'Help develop the concept for the selected poem or text.',
                    'Create and maintain a realistic production timeline.',
                    'Coordinate animators, illustrators, narrators, and editors.',
                    'Monitor overall progress and address creative hurdles.',
                    'Help review and approve the final production before release.'
                ],
                qualities: 'Strong organizational skills, collaborative mindset, passion for storytelling and creative direction.'
            },
            {
                id: 'claymation-animator',
                title: 'Claymation Animator',
                icon: 'fa-shapes',
                shortDesc: 'Creates clay characters, objects, environments, and stop-motion sequences that embody the literature.',
                responsibilities: [
                    'Design and sculpt clay characters and props based on the text.',
                    'Build tactile environments, mini-sets, and scenes.',
                    'Plan and storyboard stop-motion sequences.',
                    'Capture high-quality frame-by-frame sequences.',
                    'Interpret the literary work visually through motion and texture.',
                    'Collaborate closely with the Project Lead and Video Editor.'
                ],
                qualities: 'Patience, tactile craft or sculpture interest, visual curiosity, attention to detail.'
            },
            {
                id: 'illustration-artist',
                title: 'Illustration & Motion Artist',
                icon: 'fa-paint-brush',
                shortDesc: 'Creates hand-drawn or digital artwork, backgrounds, and expressive 2D motion elements.',
                responsibilities: [
                    'Create illustrations, character concepts, and atmospheric backgrounds.',
                    'Develop the unified visual style and aesthetic palette of the piece.',
                    'Create simple 2D animation, motion graphics, or illustrated transitions.',
                    'Interpret the poem and its themes visually.',
                    'Collaborate closely with the Project Lead and Video Editor.'
                ],
                qualities: 'Creativity, drawing/digital art enthusiasm, sensitivity to literary mood.'
            },
            {
                id: 'video-editor',
                title: 'Video Editor & Post-Production',
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
                    id: 'lead_conflict',
                    label: 'If one member of your team falls behind schedule, how would you handle the situation?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'How would you offer support while keeping the project on track?'
                },
                {
                    id: 'lead_motivation',
                    label: 'Why are you interested in being a Project Lead for Poetry in Motion?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'What excites you about guiding this production?'
                }
            ],
            'claymation-animator': [
                {
                    id: 'clay_experience',
                    label: 'Have you worked with clay, sculpture, crafts, or stop-motion before? Describe any relevant experience.',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Tell us about your background with clay, model making, or physical crafts (even beginner or hobby level)...'
                },
                {
                    id: 'clay_stopmotion',
                    label: 'Have you ever created stop-motion animation? If so, what tools or apps have you used (e.g. Stop Motion Studio, Dragonframe, phone apps)?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Share any tools, apps, or experiments you have tried...'
                },
                {
                    id: 'clay_interpretation',
                    label: 'What interests you about creating visual interpretations of literature through clay or stop-motion?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'What appeals to you about bringing poetry or prose to life?'
                },
                {
                    id: 'clay_file',
                    label: 'Upload photos or video clips of previous work, sculptures, or crafts (Optional but recommended):',
                    type: 'file',
                    accept: 'image/*,video/*',
                    required: false
                },
                {
                    id: 'clay_portfolio',
                    label: 'Optional portfolio link, Instagram art page, or Google Drive link:',
                    type: 'url',
                    required: false,
                    placeholder: 'https://...'
                }
            ],
            'illustration-artist': [
                {
                    id: 'art_medium',
                    label: 'Do you primarily work with traditional art, digital art, or both?',
                    type: 'select',
                    options: ['Traditional Art (Pencil, Ink, Paint)', 'Digital Art (Procreate, Photoshop, etc.)', 'Both Traditional and Digital'],
                    required: true
                },
                {
                    id: 'art_tools',
                    label: 'What drawing or illustration tools, programs, or apps do you regularly use?',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. Procreate, Clip Studio, Photoshop, Adobe Illustrator, sketchbook & watercolors...'
                },
                {
                    id: 'art_animation',
                    label: 'Have you worked with animation or motion graphics before? Which programs or apps do you use?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Describe any 2D animation, frame-by-frame, or motion graphics experience (all levels welcome)...'
                },
                {
                    id: 'art_style',
                    label: 'Describe your artistic style, visual influences, or aesthetic interests.',
                    type: 'textarea',
                    required: true,
                    placeholder: 'What genres, visual tones, or artists inspire you?'
                },
                {
                    id: 'art_file',
                    label: 'Upload examples of your artwork or illustrations (Optional but recommended):',
                    type: 'file',
                    accept: 'image/*',
                    required: false
                },
                {
                    id: 'art_portfolio',
                    label: 'Optional portfolio link, ArtStation, Behance, or art Instagram:',
                    type: 'url',
                    required: false,
                    placeholder: 'https://...'
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
                    label: 'Describe your video editing experience.',
                    type: 'textarea',
                    required: true,
                    placeholder: 'What kind of projects have you edited (YouTube, reels, short films, school projects)?'
                },
                {
                    id: 'editor_technical',
                    label: 'Have you worked with audio synchronization, subtitles/captions, transitions, or motion graphics?',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Share your familiarity with audio timing, dynamic text, sound effects, etc.'
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
            ]
        }
    }
];

// Helper Functions
function getOpportunityById(id) {
    return VERBA_OPPORTUNITIES.find(o => o.id === id) || VERBA_OPPORTUNITIES[0];
}

function getAllOpportunities() {
    return VERBA_OPPORTUNITIES;
}
